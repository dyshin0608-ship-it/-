#!/usr/bin/env python3
"""
mix_sfx.py — 내레이션에 효과음을 얹는다.

효과음 위치는 "몇 분 몇 초"로 박아두지 않는다. 대사가 바뀌면 다 어긋나기
때문이다. 대신 "어느 줄의 어느 어구"로 지정하고, 그 어구가 줄 안에서
차지하는 글자 위치로 시각을 계산한다.

  final/narration_full.mp3  +  sfx/*.wav
        ↓
  final/narration_sfx.mp3   효과음 포함 (길이·싱크 동일)
  final/sfx_cues.csv        실제로 들어간 시각 목록

사용법:
    python tools/mix_sfx.py
    python tools/mix_sfx.py --dry-run     # 넣지 않고 시각만 확인
"""
from __future__ import annotations

import argparse
import csv
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
TL = Path("final/timeline.csv")
SRC = Path("final/narration_full.mp3")
SFX = Path("sfx")
OUT = Path("final/narration_sfx.mp3")
CUES = Path("final/sfx_cues.csv")

# (줄 ID, 줄 안에서 찾을 어구, 효과음, 음량dB, 반복횟수, 반복간격초, 메모)
# 음량은 풀스케일 기준이다. 내레이션 최대 진폭이 0.77 이라 -20dB 로는 말소리에
# 묻혀 전혀 들리지 않았다. 효과음 종류별로 -6 ~ -17dB 범위에서 맞췄다.
# 어구가 빈 문자열이면 그 줄이 시작하기 직전에 넣는다.
CUELIST = [
    ("H05", "15만",     "beep_tick",   -7, 1, 0,    "일당 숫자"),
    ("H05", "13만",     "beep_tick",   -7, 1, 0,    "일당 숫자"),
    ("H05", "11만",     "beep_tick",   -7, 1, 0,    "일당 숫자"),
    ("H05", "줄어듭니다", "drop",  -10, 1, 0,    "값이 내려감"),
    ("H06", "20만",     "rise",   -7, 1, 0,    "값이 뜀"),
    ("H07", "서류 한 장", "paper_flip",  -10, 1, 0,   "종이 넘김"),
    ("M01", "열 칸",     "tok",  -10, 10, 0.11, "칸 세기"),
    ("A01", "",         "levelup",   -8, 1, 0,    "1칸 시작"),
    ("B01", "",         "levelup",   -8, 1, 0,    "2칸 시작"),
    ("B02", "돌아다닙니다", "step",  -14, 4, 0.30, "걷는 소리"),
    ("B03", "무전으로",   "radio",   -9, 1, 0,    "무전"),
    ("C01", "",         "levelup",   -8, 1, 0,    "3칸 시작"),
    ("C04", "71명",     "boom_low",   -7, 1, 0,    "사망자 수"),
    ("C07", "교육일지",   "tak",   -9, 5, 0.52, "서류 나열"),
    ("D01", "",         "levelup",   -8, 1, 0,    "4칸 시작"),
    ("D01", "이름이",     "stamp",   -6, 1, 0,    "도장"),
    ("D07", "두 배",     "kaching",   -7, 1, 0,    "연봉 두 배"),
    ("E03", "갈립니다",   "whoosh",  -10, 1, 0,    "길이 갈림"),
    ("E05", "댓글로",     "pop",   -7, 1, 0,    "댓글 유도"),
]
LEAD = 0.30      # 줄 시작 전에 넣는 효과음을 얼마나 앞당길지


def sec(ts: str) -> float:
    h, m, s = ts.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def tc(x: float) -> str:
    return f"{int(x//60)}:{x%60:06.3f}"


def load_wav(p: Path) -> np.ndarray:
    with wave.open(str(p), "rb") as w:
        if w.getframerate() != SR:
            sys.exit(f"[오류] {p.name} 의 샘플레이트가 {w.getframerate()} 입니다 (필요: {SR})")
        return np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768


def main():
    ap = argparse.ArgumentParser(description="내레이션에 효과음 얹기")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--level", type=float, default=0.0,
                    help="모든 효과음 음량을 한꺼번에 올리거나 내린다(dB). 예: -6")
    ap.add_argument("--out", type=Path, default=OUT)
    a = ap.parse_args()

    if not TL.is_file() or not SRC.is_file():
        sys.exit("[오류] final/timeline.csv 와 final/narration_full.mp3 가 필요합니다.")
    rows = {r["ID"]: r for r in csv.DictReader(TL.open(encoding="utf-8-sig"))}

    placed, warn = [], []
    for pid, phrase, name, gain, rep, step, note in CUELIST:
        if pid not in rows:
            warn.append(f"{pid}: 그런 줄이 없습니다"); continue
        r = rows[pid]
        st, en, text = sec(r["시작"]), sec(r["끝"]), r["대사"]
        if phrase == "":
            at = max(0.0, st - LEAD)
        else:
            i = text.find(phrase)
            if i < 0:
                warn.append(f"{pid}: \"{phrase}\" 를 대사에서 찾지 못해 줄 시작에 넣습니다")
                at = st
            else:
                at = st + (en - st) * (i / max(1, len(text)))
        for k in range(rep):
            placed.append({"time": at + k * step, "sfx": name, "gain": gain + a.level,
                           "id": pid, "note": note})

    placed.sort(key=lambda x: x["time"])
    for w in warn:
        print(f"  [경고] {w}")
    print(f"효과음 {len(placed)}개 / 종류 {len({p['sfx'] for p in placed})}가지"
          + (f" / 전체 {a.level:+.0f}dB" if a.level else ""))
    for p in placed:
        print(f"  {tc(p['time']):>10s}  {p['sfx']:10s} {p['gain']:6.1f}dB  {p['id']}  {p['note']}")

    with CUES.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["시각", "초", "효과음", "음량dB", "기준줄", "메모"])
        for p in placed:
            w.writerow([tc(p["time"]), f"{p['time']:.3f}", p["sfx"], p["gain"], p["id"], p["note"]])
    if a.dry_run:
        print(f"\n(넣지 않음) 시각 목록 → {CUES}")
        return

    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(SRC), "-f", "s16le",
                          "-acodec", "pcm_s16le", "-ar", str(SR), "-ac", "1", "-"],
                         capture_output=True, check=True).stdout
    base = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768
    mix = base.copy()
    cache = {}
    for p in placed:
        if p["sfx"] not in cache:
            f = SFX / f"{p['sfx']}.wav"
            if not f.is_file():
                sys.exit(f"[오류] 효과음이 없습니다: {f} — 먼저 python tools/make_sfx.py")
            cache[p["sfx"]] = load_wav(f)
        y = cache[p["sfx"]] * (10 ** (p["gain"] / 20))
        i = int(p["time"] * SR)
        j = min(i + y.size, mix.size)
        if j > i:
            mix[i:j] += y[: j - i]

    peak = float(np.abs(mix).max())
    if peak > 0.98:
        mix *= 0.98 / peak
        print(f"\n  최대 진폭 {peak:.2f} → 0.98 로 낮춤")
    data = (np.clip(mix, -1, 1) * 32767).astype("<i2")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR),
                    "-ac", "1", "-i", "pipe:0", "-b:a", "192k", str(a.out)],
                   input=data.tobytes(), check=True)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", str(a.out)],
                             capture_output=True, text=True, check=True).stdout.strip())
    print(f"\n{a.out}  {int(d//60)}분 {d%60:.1f}초  {OUT.stat().st_size//1024}KB")
    print(f"{CUES}")


if __name__ == "__main__":
    main()
