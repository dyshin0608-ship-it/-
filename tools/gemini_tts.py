#!/usr/bin/env python3
"""
gemini_tts.py — Gemini TTS 로 내레이션 69줄을 줄 단위 mp3 로 만든다.

  narration/ep1_script.tsv   원고 (ID <탭> 문장)      ← 건드리지 않는다
  narration/pronounce.tsv    발음 교정 (TTS 입력에만)
  audio/<ID>.mp3             출력

API 키는 파일에서만 읽는다. 명령줄이나 코드에 적지 않는다.

사용법:
    export GEMINI_KEY_FILE=~/.gemini_key          # 키가 든 파일
    python tools/gemini_tts.py --voice Charon
    python tools/gemini_tts.py --voice Charon --only H01 C04
    python tools/gemini_tts.py --sample H01 --voices Charon Gacrux Rasalgethi
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

MODEL = "gemini-3.8-flash-tts"
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"
SCRIPT = Path("narration/ep1_script.tsv")
PRONOUNCE = Path("narration/pronounce.tsv")
OUTDIR = Path("audio")
# gemini-3.8-flash-tts 는 프롬프트에 넣은 지시문까지 그대로 소리 내어 읽는다.
# (본문만 42자 → 6.0초 / 짧은 지시 추가 → 10.2초 / 긴 지시 추가 → 18.6초 로 확인)
# systemInstruction 과 speechConfig.prompt 는 이 모델에서 거부된다.
# 따라서 본문만 보내고, 톤은 목소리 선택으로 정한다.
STYLE = ""
LUFS = "-16"
PACE = 4.0          # 요청 간 최소 간격(초) — 무료 할당량 보호
MAX_RETRY = 5
EXPECTED = 69


def load_tsv(path: Path, comments=False):
    rows = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw.strip() or (comments and raw.lstrip().startswith("#")):
            continue
        a, b = raw.split("\t", 1)
        rows.append((a.strip(), b.strip()))
    return rows


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


def synth(key: str, text: str, voice: str, dest: Path) -> float:
    body = {
        "contents": [{"parts": [{"text": STYLE + text}]}],  # STYLE 은 빈 문자열
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    data = json.dumps(body).encode()
    last = ""
    for attempt in range(MAX_RETRY):
        req = urllib.request.Request(
            ENDPOINT.format(m=MODEL), data=data, method="POST",
            headers={"x-goog-api-key": key, "Content-Type": "application/json"})
        try:
            r = json.loads(urllib.request.urlopen(req, timeout=240).read())
            break
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf8", "replace")
            last = f"HTTP {e.code} {raw[:160]}"
            if e.code in (429, 500, 502, 503):
                wait = min(60, 5 * (2 ** attempt))
                print(f"      제한/오류 — {wait}초 후 재시도 ({attempt+1}/{MAX_RETRY})")
                time.sleep(wait)
                continue
            raise RuntimeError(last)
        except Exception as e:                       # 네트워크 등
            last = f"{type(e).__name__}: {e}"
            time.sleep(5 * (attempt + 1))
            continue
    else:
        raise RuntimeError(last or "재시도 모두 실패")

    try:
        part = r["candidates"][0]["content"]["parts"][0]["inlineData"]
    except (KeyError, IndexError):
        raise RuntimeError(f"오디오가 없는 응답: {json.dumps(r)[:200]}")

    blob = base64.b64decode(part["data"])
    mime = part.get("mimeType", "")
    tmp = dest.with_suffix(".src")
    tmp.write_bytes(blob)
    # mimeType 이 raw PCM 이면 포맷을 알려준다. audio/wav 면 헤더가 이미 있다.
    pre = []
    if "L16" in mime or "pcm" in mime.lower():
        rate = "24000"
        if "rate=" in mime:
            rate = mime.split("rate=")[-1].split(";")[0]
        pre = ["-f", "s16le", "-ar", rate, "-ac", "1"]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *pre, "-i", str(tmp),
                    "-af", f"loudnorm=I={LUFS}:TP=-1.5:LRA=11",
                    "-ar", "44100", "-ac", "1", "-b:a", "128k", str(dest)], check=True)
    dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(dest)],
        capture_output=True, text=True, check=True).stdout.strip())
    tmp.unlink(missing_ok=True)
    return dur


def main():
    ap = argparse.ArgumentParser(description="Gemini TTS 내레이션 생성")
    ap.add_argument("--voice", default="Charon")
    ap.add_argument("--only", nargs="+", metavar="ID")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--sample", metavar="ID", help="한 줄을 여러 목소리로 비교 생성")
    ap.add_argument("--voices", nargs="+", default=["Charon", "Gacrux", "Rasalgethi"])
    ap.add_argument("--pace", type=float, default=PACE)
    a = ap.parse_args()

    key = read_key()
    rows = load_tsv(SCRIPT)
    over = dict(load_tsv(PRONOUNCE, comments=True))
    items = [(p, over.get(p, t)) for p, t in rows]
    ids = [p for p, _ in items]
    if len(items) != EXPECTED:
        print(f"  [경고] 원고 {len(items)}줄 (예상 {EXPECTED})")

    if a.sample:
        if a.sample not in ids:
            sys.exit(f"[오류] 없는 ID: {a.sample}")
        text = dict(items)[a.sample]
        out = Path("/tmp/voice_samples")
        out.mkdir(parents=True, exist_ok=True)
        print(f"{a.sample} 을(를) {len(a.voices)}개 목소리로 생성:")
        for i, v in enumerate(a.voices):
            if i:
                time.sleep(a.pace)
            try:
                d = synth(key, text, v, out / f"{v}.mp3")
                print(f"  {v:14s} {d:5.1f}초")
            except Exception as e:
                print(f"  {v:14s} 실패: {e}")
        print(f"→ {out}/")
        return

    OUTDIR.mkdir(parents=True, exist_ok=True)
    todo = [(p, t) for p, t in items
            if (not a.only or p in a.only)
            and (a.force or a.only or not (OUTDIR / f"{p}.mp3").is_file())]
    if a.only:
        miss = set(a.only) - set(ids)
        if miss:
            sys.exit(f"[오류] 없는 ID: {sorted(miss)}")
    if not todo:
        print("생성할 것이 없습니다. (--force 로 전부 재생성)")
        return

    print(f"{len(todo)}개 생성 / 목소리 {a.voice} / 간격 {a.pace}초")
    ok, fail, total = 0, [], 0.0
    for i, (pid, text) in enumerate(todo, 1):
        if i > 1:
            time.sleep(a.pace)
        try:
            d = synth(key, text, a.voice, OUTDIR / f"{pid}.mp3")
            cps = len(text) / d if d else 0
            flag = "  ← 확인" if not (2.5 <= cps <= 9.0) else ""
            print(f"  [{i:2d}/{len(todo)}] {pid}  {d:5.1f}초  {cps:4.1f}자/초{flag}")
            total += d
            ok += 1
        except Exception as e:
            print(f"  [{i:2d}/{len(todo)}] {pid}  실패: {e}")
            fail.append(pid)
    have = sum(1 for p in ids if (OUTDIR / f"{p}.mp3").is_file())
    print(f"\n성공 {ok} / 실패 {len(fail)} — audio/ 에 {have}/{len(ids)}개, 총 {total/60:.1f}분")
    if fail:
        print(f"다시: python tools/gemini_tts.py --voice {a.voice} --only {' '.join(fail)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
