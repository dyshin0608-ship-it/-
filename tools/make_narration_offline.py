#!/usr/bin/env python3
"""
make_narration_offline.py — 인터넷 TTS 없이 내레이션 mp3 를 만든다.

edge-tts 를 쓸 수 없는 환경(네트워크 차단 등)을 위한 대체 경로.
espeak-ng 로 한국어를 IPA 음소로 바꾸고, VITS 모델(ko_KO-kss, 여성)로 합성한다.

  narration/ep1_script.tsv   원고 (ID <탭> 문장)      ← 건드리지 않는다
  narration/pronounce.tsv    발음 교정 (TTS 입력에만)
  audio/<ID>.mp3             출력

필요한 것:
    pip install sherpa-onnx soundfile numpy
    apt-get install -y espeak-ng espeak-ng-data ffmpeg
    모델은 없으면 자동으로 내려받는다 (약 67MB).

사용법:
    python tools/make_narration_offline.py
    python tools/make_narration_offline.py --only C14 E02
    python tools/make_narration_offline.py --check      # 음소 검증만
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tarfile
import urllib.request
from pathlib import Path

MODEL_URL = ("https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/"
             "vits-mimic3-ko_KO-kss_low.tar.bz2")
MODEL_DIR = Path("models/vits-mimic3-ko_KO-kss_low")
ESPEAK_DATA_CANDIDATES = [
    "/usr/lib/x86_64-linux-gnu/espeak-ng-data",
    "/usr/share/espeak-ng-data",
]
SCRIPT = Path("narration/ep1_script.tsv")
PRONOUNCE = Path("narration/pronounce.tsv")
OUTDIR = Path("audio")
SPEED = 1.05          # edge-tts 의 +5% 에 해당
EXPECTED = 69
LUFS = "-16"          # 유튜브 내레이션 표준 근처


def load_tsv(path: Path, comments=False):
    rows = []
    if not path.is_file():
        return rows
    for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip() or (comments and raw.lstrip().startswith("#")):
            continue
        if "\t" not in raw:
            sys.exit(f"[오류] {path}:{n} 탭 없음 → {raw[:50]}")
        a, b = raw.split("\t", 1)
        rows.append((a.strip(), b.strip()))
    return rows


def ensure_model() -> Path:
    onnx = MODEL_DIR / "ko_KO-kss_low.onnx"
    if onnx.is_file():
        return MODEL_DIR
    MODEL_DIR.parent.mkdir(parents=True, exist_ok=True)
    tar = MODEL_DIR.parent / "ko_model.tar.bz2"
    print(f"모델 내려받는 중 … ({MODEL_URL.rsplit('/', 1)[-1]}, 약 67MB)")
    urllib.request.urlretrieve(MODEL_URL, tar)
    with tarfile.open(tar, "r:bz2") as t:
        t.extractall(MODEL_DIR.parent, filter="data")
    tar.unlink(missing_ok=True)
    if not onnx.is_file():
        sys.exit(f"[오류] 모델 압축 해제 실패: {onnx}")
    print(f"모델 준비됨 → {MODEL_DIR}")
    return MODEL_DIR


def espeak_data_dir() -> str:
    for d in ESPEAK_DATA_CANDIDATES:
        if Path(d).is_dir():
            return d
    sys.exit("[오류] espeak-ng-data 를 찾을 수 없습니다. apt-get install espeak-ng-data")


def to_ipa(text: str) -> str:
    r = subprocess.run(["espeak-ng", "-q", "--ipa", "-v", "ko", text],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"espeak-ng 실패: {r.stderr.strip()[:100]}")
    return " ".join(r.stdout.split()).strip()


def load_tokens(model_dir: Path) -> set[str]:
    toks = set()
    for line in (model_dir / "tokens.txt").read_text(encoding="utf-8").splitlines():
        if line:
            toks.add(line.split(" ")[0] if " " in line else line)
    toks.add(" ")
    return toks


def main():
    ap = argparse.ArgumentParser(description="오프라인 한국어 내레이션 mp3 생성")
    ap.add_argument("--only", nargs="+", metavar="ID")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--check", action="store_true", help="합성 없이 음소만 검증")
    a = ap.parse_args()

    for tool in ("espeak-ng", "ffmpeg"):
        if not shutil.which(tool):
            sys.exit(f"[오류] {tool} 이 없습니다. apt-get install -y {tool}")

    rows = load_tsv(SCRIPT)
    if not rows:
        sys.exit(f"[오류] {SCRIPT} 없음. 저장소 루트에서 실행하세요.")
    ids = [p for p, _ in rows]
    if len(ids) != len(set(ids)):
        sys.exit(f"[오류] ID 중복: {sorted({p for p in ids if ids.count(p) > 1})}")
    if len(rows) != EXPECTED:
        print(f"  [경고] 원고 {len(rows)}줄 (예상 {EXPECTED})")

    over = dict(load_tsv(PRONOUNCE, comments=True))
    unknown = set(over) - set(ids)
    if unknown:
        sys.exit(f"[오류] 교정표에 없는 ID: {sorted(unknown)}")

    model_dir = ensure_model()
    tokens = load_tokens(model_dir)

    # 음소 검증: 모델이 모르는 기호가 섞이면 그 줄은 소리가 깨진다
    print(f"원고 {len(rows)}줄 / 교정 {len(over)}줄 / 음소 검증 …")
    phonemes, bad = {}, []
    for pid, text in rows:
        ph = to_ipa(over.get(pid, text))
        unknown_ch = sorted({c for c in ph if c not in tokens})
        if unknown_ch:
            bad.append((pid, unknown_ch))
        phonemes[pid] = ph
    if bad:
        print("  [경고] 모델이 모르는 기호가 있는 줄:")
        for pid, ch in bad:
            print(f"    {pid}: {ch}")
    else:
        print("  모든 줄의 음소가 모델 토큰 안에 있습니다.")

    if a.check:
        for pid, _ in rows:
            mark = "교정" if pid in over else "    "
            print(f"  {mark} {pid}  {phonemes[pid][:90]}")
        return

    import numpy as np
    import sherpa_onnx
    import soundfile as sf

    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=str(model_dir / "ko_KO-kss_low.onnx"),
                tokens=str(model_dir / "tokens.txt")),
            num_threads=4))
    tts = sherpa_onnx.OfflineTts(cfg)

    OUTDIR.mkdir(parents=True, exist_ok=True)
    tmp = Path(".narration_tmp.wav")
    todo = [(p, t) for p, t in rows
            if (not a.only or p in a.only)
            and (a.force or a.only or not (OUTDIR / f"{p}.mp3").is_file())]
    if a.only:
        miss = set(a.only) - set(ids)
        if miss:
            sys.exit(f"[오류] 없는 ID: {sorted(miss)}")
    if not todo:
        print("생성할 것이 없습니다. (--force 로 전부 재생성)")
        return

    print(f"\n{len(todo)}개 생성 (speed={SPEED}, 목소리 ko_KO-kss 여성):")
    ok, fail = 0, []
    for i, (pid, _) in enumerate(todo, 1):
        try:
            g = sherpa_onnx.GenerationConfig()
            g.phoneme_codepoints = [[ord(c) for c in phonemes[pid]]]
            g.sid, g.speed = 0, SPEED
            audio = tts.generate(phonemes[pid], g)
            arr = np.asarray(audio.samples, dtype="float32")
            if arr.size == 0:
                raise RuntimeError("빈 오디오")
            sf.write(tmp, arr, audio.sample_rate)
            dest = OUTDIR / f"{pid}.mp3"
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp),
                 "-af", f"loudnorm=I={LUFS}:TP=-1.5:LRA=11",
                 "-ar", "44100", "-ac", "1", "-b:a", "128k", str(dest)],
                check=True)
            dur = arr.size / audio.sample_rate
            print(f"  [{i:2d}/{len(todo)}] {pid}.mp3  {dur:4.1f}s  {dest.stat().st_size // 1024}KB")
            ok += 1
        except Exception as e:
            print(f"  [{i:2d}/{len(todo)}] {pid}  실패: {e}")
            fail.append(pid)
    tmp.unlink(missing_ok=True)

    total = sum(1 for p in ids if (OUTDIR / f"{p}.mp3").is_file())
    print(f"\n성공 {ok} / 실패 {len(fail)} — audio/ 에 {total}/{len(ids)}개")
    if fail:
        print(f"다시: python tools/make_narration_offline.py --only {' '.join(fail)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
