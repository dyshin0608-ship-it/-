#!/usr/bin/env python3
"""
gemini_tts_batch.py — 묶음 단위로 Gemini TTS 음성을 만든다.

무료 한도가 모델당 하루 10요청이라 줄마다 요청할 수 없다. 10줄씩 묶어
한 번에 읽히고, 나중에 split_narration.py 로 줄 단위로 자른다.

규칙:
  · 스타일 지시문을 넣지 않는다. 이 모델은 지시문까지 소리 내어 읽는다.
  · 모델과 목소리를 중간에 바꾸지 않는다. 한도가 차면 어디까지 했는지
    알리고 멈춘다. 모델이 바뀌면 같은 목소리 이름이어도 음색이 달라진다.
  · API 키는 GEMINI_KEY_FILE 이 가리키는 파일에서만 읽는다.

사용법:
    export GEMINI_KEY_FILE=~/.gemini_key
    python tools/gemini_tts_batch.py --manifest narration/batches_ep2/MANIFEST.tsv \
        --outdir /tmp/ep2_batches --model gemini-2.5-flash-preview-tts --voice Rasalgethi
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"


def read_key() -> str:
    p = os.environ.get("GEMINI_KEY_FILE")
    if not p:
        sys.exit("[오류] GEMINI_KEY_FILE 환경변수에 키 파일 경로를 지정하세요.")
    f = Path(p).expanduser()
    if not f.is_file():
        sys.exit(f"[오류] 키 파일이 없습니다: {f}")
    k = f.read_text(encoding="utf-8").strip()
    if not k:
        sys.exit(f"[오류] 키 파일이 비어 있습니다: {f}")
    return k


def quota_note(body: str) -> str:
    try:
        err = json.loads(body)["error"]
        for d in err.get("details", []):
            if "QuotaFailure" in d.get("@type", ""):
                v = d.get("violations", [{}])[0]
                return f"{v.get('quotaId')} = {v.get('quotaValue')}"
    except Exception:
        pass
    return body[:120]


def request(key: str, model: str, voice: str, text: str) -> dict:
    body = {
        "contents": [{"parts": [{"text": text}]}],      # 지시문 없이 본문만
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    req = urllib.request.Request(
        ENDPOINT.format(m=model), data=json.dumps(body).encode(), method="POST",
        headers={"x-goog-api-key": key, "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=900).read())


def save(resp: dict, out: Path) -> float:
    part = resp["candidates"][0]["content"]["parts"][0]["inlineData"]
    blob = base64.b64decode(part["data"])
    mime = part.get("mimeType", "")
    tmp = out.with_suffix(".src")
    tmp.write_bytes(blob)
    pre = []
    if "wav" not in mime.lower():                       # raw PCM 이면 포맷을 알려준다
        rate = mime.split("rate=")[-1].split(";")[0] if "rate=" in mime else "24000"
        pre = ["-f", "s16le", "-ar", rate, "-ac", "1"]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *pre, "-i", str(tmp),
                    "-ar", "44100", "-ac", "1", "-b:a", "192k", str(out)], check=True)
    tmp.unlink(missing_ok=True)
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(out)],
        capture_output=True, text=True, check=True).stdout.strip())


def main():
    ap = argparse.ArgumentParser(description="묶음 단위 Gemini TTS 생성")
    ap.add_argument("--manifest", required=True, type=Path)
    ap.add_argument("--outdir", required=True, type=Path)
    ap.add_argument("--model", required=True)
    ap.add_argument("--voice", required=True)
    ap.add_argument("--pace", type=float, default=6.0)
    ap.add_argument("--retry", type=int, default=3)
    a = ap.parse_args()

    key = read_key()
    base = a.manifest.parent
    rows = [l.split("\t") for l in
            a.manifest.read_text(encoding="utf-8").splitlines()[1:] if l.strip()]
    a.outdir.mkdir(parents=True, exist_ok=True)

    print(f"모델 {a.model} / 목소리 {a.voice} / {len(rows)}묶음")
    done, total = [], 0.0
    for r in rows:
        n, frm, to, _, _, fname = r[0], r[1], r[2], r[3], r[4], r[5]
        out = a.outdir / f"b{int(n):02d}.mp3"
        if out.is_file():
            d = float(subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=nw=1:nk=1", str(out)],
                capture_output=True, text=True, check=True).stdout.strip())
            print(f"  batch{int(n):02d} {frm}~{to}  이미 있음 {d:5.1f}초")
            done.append((n, frm, to, out, d)); total += d
            continue
        text = (base / fname).read_text(encoding="utf-8").strip()
        for att in range(a.retry):
            if done or att:
                time.sleep(a.pace if not att else min(60, 10 * (2 ** att)))
            try:
                resp = request(key, a.model, a.voice, text)
                break
            except urllib.error.HTTPError as e:
                note = quota_note(e.read().decode("utf8", "replace"))
                if e.code == 429:
                    print(f"  batch{int(n):02d} 한도/제한 — {note}")
                    if att == a.retry - 1:
                        print(f"\n[중단] 오늘 한도가 찼습니다. {len(done)}/{len(rows)}묶음까지 완료.")
                        print(f"  완료: {', '.join(f'batch{int(x[0]):02d}({x[1]}~{x[2]})' for x in done) or '없음'}")
                        print(f"  남은 묶음은 한도가 풀린 뒤 같은 명령을 다시 실행하면 이어서 만듭니다.")
                        print(f"  모델을 바꾸면 음색이 달라지므로 바꾸지 마세요.")
                        sys.exit(2)
                    continue
                sys.exit(f"[중단] batch{int(n):02d} HTTP {e.code} {note}")
            except Exception as e:
                print(f"  batch{int(n):02d} {type(e).__name__} — 재시도 {att+1}/{a.retry}")
                if att == a.retry - 1:
                    sys.exit(f"[중단] batch{int(n):02d} 실패: {e}")
        d = save(resp, out)
        total += d
        done.append((n, frm, to, out, d))
        print(f"  batch{int(n):02d} {frm}~{to}  {d:5.1f}초  {out.stat().st_size//1024}KB")

    (a.outdir / "manifest.json").write_text(json.dumps(
        [{"batch": x[0], "from": x[1], "to": x[2], "file": str(x[3]), "dur": x[4]}
         for x in done], ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n{len(done)}묶음 / 합계 {total/60:.1f}분 / 모델 {a.model} / 목소리 {a.voice}")


if __name__ == "__main__":
    main()
