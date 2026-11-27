#!/usr/bin/env python3
"""
build_final_ep2.py — 2편 줄 음성을 이어 붙이고 타임코드를 낸다.

  audio_ep2/<ID>.mp3
        ↓
  final_ep2/narration_full.mp3
  final_ep2/timeline.csv      (ID, 시작, 끝  /  00:00:00.000)

mp3 를 이어 붙이면 프레임 단위 오차가 쌓여 뒤로 갈수록 시각이 밀린다.
각 줄을 PCM 으로 풀어 샘플 위치에 직접 얹는다.
"""
from __future__ import annotations

import argparse
import csv
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 44100
SCRIPT = Path("narration/ep2_script.tsv")
AUDIO = Path("audio_ep2")
OUT = Path("final_ep2")


def dur(p: Path) -> float:
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(p)],
        capture_output=True, text=True, check=True).stdout.strip())


def tc(x: float) -> str:
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def pcm(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le",
         "-acodec", "pcm_s16le", "-ar", str(SR), "-ac", "1", "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<i2")


def main():
    ap = argparse.ArgumentParser(description="2편 통합 음성·타임코드 생성")
    ap.add_argument("--gap", type=float, default=0.45, help="같은 구간 줄 사이 간격(초)")
    ap.add_argument("--section-gap", type=float, default=1.0, help="구간 전환 간격(초)")
    a = ap.parse_args()

    ids = [l.split("\t", 1)[0] for l in
           SCRIPT.read_text(encoding="utf-8").splitlines() if l.strip()]
    missing = [i for i in ids if not (AUDIO / f"{i}.mp3").is_file()]
    if missing:
        sys.exit(f"[오류] 음성이 없는 줄: {' '.join(missing)}")

    OUT.mkdir(parents=True, exist_ok=True)
    rows, cursor, prev = [], 0.0, None
    for pid in ids:
        sec = pid[0]
        if prev is not None:
            cursor += a.section_gap if sec != prev else a.gap
        d = dur(AUDIO / f"{pid}.mp3")
        rows.append({"id": pid, "start": cursor, "end": cursor + d})
        cursor += d
        prev = sec
    total = cursor

    buf = np.zeros(int(round(total * SR)) + SR // 2, dtype=np.int32)
    for r in rows:
        seg = pcm(AUDIO / f"{r['id']}.mp3")
        off = int(round(r["start"] * SR))
        end = min(off + seg.size, buf.size)
        buf[off:end] += seg[: end - off]
    buf = np.clip(buf, -32768, 32767).astype("<i2")
    buf = buf[: int(round(rows[-1]["end"] * SR)) + int(0.3 * SR)]

    full = OUT / "narration_full.mp3"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR),
                    "-ac", "1", "-i", "pipe:0", "-b:a", "192k", str(full)],
                   input=buf.tobytes(), check=True)

    with (OUT / "timeline.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ID", "시작", "끝"])
        for r in rows:
            w.writerow([r["id"], tc(r["start"]), tc(r["end"])])

    real = dur(full)
    print(f"{full}  {int(real//60)}분 {real%60:.1f}초  {full.stat().st_size//1024}KB")
    print(f"{OUT}/timeline.csv  {len(rows)}줄  (계산값 {tc(total)})")
    cur = None
    for r in rows:
        if r["id"][0] != cur:
            cur = r["id"][0]
            sl = [x for x in rows if x["id"][0] == cur]
            print(f"  {cur}  {tc(sl[0]['start'])} ~ {tc(sl[-1]['end'])}  {len(sl):2d}줄")


if __name__ == "__main__":
    main()
