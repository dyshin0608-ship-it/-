#!/usr/bin/env python3
"""
split_narration.py — 한 덩어리로 받은 내레이션 음원을 69개 줄 단위 mp3 로 자른다.

클로바더빙처럼 다운로드 횟수가 제한된 서비스에서, 전체를 한 파일로 받아
여기서 쪼갤 때 쓴다. 무음 구간을 찾아 끊고, 원고 순서대로 ID 를 붙인다.

사용법:
    python tools/split_narration.py <받은음원.mp3>
    python tools/split_narration.py <음원> --noise -32dB --min-sil 0.45
    python tools/split_narration.py <음원> --dry-run      # 자르지 않고 구간만 확인
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

SCRIPT = Path("narration/ep1_script.tsv")
PRONOUNCE = Path("narration/pronounce.tsv")
OUTDIR = Path("audio")
PAD = 0.12          # 구간 앞뒤 여유 (초)
LUFS = "-16"


def load_tsv(path, comments=False):
    rows = []
    for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip() or (comments and raw.lstrip().startswith("#")):
            continue
        a, b = raw.split("\t", 1)
        rows.append((a.strip(), b.strip()))
    return rows


def duration(path: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", str(path)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def find_silences(src: Path, noise: str, min_sil: float):
    r = subprocess.run(
        ["ffmpeg", "-i", str(src), "-af",
         f"silencedetect=noise={noise}:d={min_sil}", "-f", "null", "-"],
        capture_output=True, text=True)
    starts = [float(m) for m in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(m) for m in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return starts, ends


def build_segments(total: float, starts, ends):
    """무음 구간 사이의 '소리 구간' 목록을 만든다."""
    segs, cur = [], 0.0
    for s, e in zip(starts, ends + [total] * (len(starts) - len(ends))):
        if s > cur + 0.15:
            segs.append((cur, s))
        cur = e
    if total > cur + 0.15:
        segs.append((cur, total))
    return segs


def main():
    ap = argparse.ArgumentParser(description="한 덩어리 음원을 줄 단위로 자른다")
    ap.add_argument("source", type=Path)
    ap.add_argument("--noise", default="-33dB", help="무음 판정 기준 (기본 -33dB)")
    ap.add_argument("--min-sil", type=float, default=0.40, help="무음 최소 길이 초 (기본 0.40)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    if not a.source.is_file():
        sys.exit(f"[오류] 음원을 찾을 수 없습니다: {a.source}")
    rows = load_tsv(SCRIPT)
    over = dict(load_tsv(PRONOUNCE, comments=True))
    texts = [(p, over.get(p, t)) for p, t in rows]

    total = duration(a.source)
    starts, ends = find_silences(a.source, a.noise, a.min_sil)
    segs = build_segments(total, starts, ends)
    print(f"음원 {total:.1f}초 / 원고 {len(texts)}줄 / 찾은 구간 {len(segs)}개 "
          f"(noise={a.noise}, min-sil={a.min_sil})")

    if len(segs) != len(texts):
        print(f"\n  [불일치] 구간 {len(segs)} ≠ 원고 {len(texts)}")
        print("  조정해 보세요:")
        print(f"    구간이 너무 많으면 → --min-sil {a.min_sil + 0.15:.2f}  (짧은 숨은 무시)")
        print(f"    구간이 너무 적으면 → --min-sil {max(0.15, a.min_sil - 0.15):.2f} "
              f"또는 --noise -28dB")
        for i, (s, e) in enumerate(segs[:8], 1):
            print(f"    {i:2d}: {s:7.2f} → {e:7.2f}  ({e - s:4.1f}s)")
        if not a.dry_run:
            sys.exit(1)

    # 길이 비례 검증: 글자 수와 구간 길이가 크게 어긋나면 경계가 틀린 것
    if len(segs) == len(texts):
        cps = [(e - s) / max(1, len(t)) for (s, e), (_, t) in zip(segs, texts)]
        avg = sum(cps) / len(cps)
        odd = [(texts[i][0], cps[i] / avg) for i in range(len(cps))
               if cps[i] / avg < 0.55 or cps[i] / avg > 1.9]
        if odd:
            print("  [확인 필요] 글자수 대비 길이가 이상한 줄:")
            for pid, r in odd[:10]:
                print(f"    {pid}  비율 {r:.2f}")
        else:
            print("  모든 구간 길이가 글자수와 맞습니다.")

    if a.dry_run:
        for (pid, t), (s, e) in zip(texts, segs):
            print(f"  {pid}  {s:7.2f} → {e:7.2f}  ({e - s:4.1f}s)  {t[:28]}")
        return

    OUTDIR.mkdir(parents=True, exist_ok=True)
    ok = 0
    for (pid, _), (s, e) in zip(texts, segs):
        ss = max(0.0, s - PAD)
        dur = (e - s) + PAD * 2
        dest = OUTDIR / f"{pid}.mp3"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{ss:.3f}",
             "-t", f"{dur:.3f}", "-i", str(a.source),
             "-af", f"loudnorm=I={LUFS}:TP=-1.5:LRA=11",
             "-ar", "44100", "-ac", "1", "-b:a", "128k", str(dest)],
            check=True)
        ok += 1
        print(f"  {pid}.mp3  {dur:4.1f}s  {dest.stat().st_size // 1024}KB")
    print(f"\n{ok}/{len(texts)}개 생성 → {OUTDIR}/")


if __name__ == "__main__":
    main()
