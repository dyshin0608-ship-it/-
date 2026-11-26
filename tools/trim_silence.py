#!/usr/bin/env python3
"""
trim_silence.py — 줄 단위 음성의 앞뒤 무음을 일정하게 다듬는다.

분할기는 줄 사이 무음의 한가운데를 자르기 때문에 파일마다 앞뒤로 0.5초쯤
무음이 붙는다. 그대로 두면 통합본에서 줄 간격이 의도보다 1초 가까이 늘어난다.
여기서 말소리 구간만 남기고 앞뒤 여백을 고정값으로 맞춘다.

사용법:
    python tools/trim_silence.py            # audio/ 전체
    python tools/trim_silence.py --head 0.08 --tail 0.15
    python tools/trim_silence.py --dry-run
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np

SCRIPT = Path("narration/ep1_script.tsv")
AUDIO = Path("audio")
PROBE_SR = 22050
THRESH = 0.012          # 말소리로 볼 최소 진폭
WIN = 0.02              # 분석 창(초)


def speech_span(p: Path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(p), "-f", "s16le", "-acodec", "pcm_s16le",
         "-ar", str(PROBE_SR), "-ac", "1", "-"], capture_output=True, check=True).stdout
    a = np.abs(np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768)
    w = int(WIN * PROBE_SR)
    n = a.size // w
    if n == 0:
        return None
    env = a[:n * w].reshape(n, w).max(axis=1)
    idx = np.where(env > THRESH)[0]
    if idx.size == 0:
        return None
    return idx[0] * WIN, (idx[-1] + 1) * WIN, a.size / PROBE_SR


def main():
    ap = argparse.ArgumentParser(description="앞뒤 무음 정리")
    ap.add_argument("--head", type=float, default=0.08, help="말소리 앞에 남길 여백(초)")
    ap.add_argument("--tail", type=float, default=0.15, help="말소리 뒤에 남길 여백(초)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    ids = [l.split("\t", 1)[0] for l in
           SCRIPT.read_text(encoding="utf-8").splitlines() if l.strip()]
    before = after = 0.0
    changed = 0
    for pid in ids:
        f = AUDIO / f"{pid}.mp3"
        if not f.is_file():
            print(f"  {pid}: 파일 없음"); continue
        sp = speech_span(f)
        if sp is None:
            print(f"  {pid}: 말소리를 찾지 못함 — 건너뜀"); continue
        s, e, total = sp
        ss = max(0.0, s - a.head)
        dur = min(total, e + a.tail) - ss
        before += total
        after += dur
        if a.dry_run:
            print(f"  {pid}  {total:5.2f}s → {dur:5.2f}s  (앞 {s:.2f} 뒤 {total-e:.2f})")
            continue
        tmp = f.with_suffix(".trim.mp3")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{ss:.3f}",
                        "-t", f"{dur:.3f}", "-i", str(f),
                        "-ar", "44100", "-ac", "1", "-b:a", "128k", str(tmp)], check=True)
        tmp.replace(f)
        changed += 1
    act = "확인" if a.dry_run else "정리"
    print(f"\n{act} 완료: {changed or len(ids)}개 / 전체 {before:.1f}초 → {after:.1f}초 "
          f"({before - after:.1f}초 감소)")


if __name__ == "__main__":
    main()
