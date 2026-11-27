#!/usr/bin/env python3
"""
split_narration.py — 묶음으로 받은 내레이션 음원을 줄 단위 mp3 로 자른다.

클로바더빙처럼 글자수·다운로드 횟수가 제한된 서비스에서, 10줄씩 묶어 받은
음원을 여기서 쪼갠다. 어느 줄이 들어있는지(--from/--to)를 알려주면 그 개수에
정확히 맞춰 자른다.

자르는 방식:
  1) 무음을 넉넉히 찾아 '자를 수 있는 지점' 후보를 모은다
  2) 각 줄의 글자수로 예상 경계 시각을 계산한다
  3) 예상 경계마다 가장 가까운 후보로 스냅한다 (순서는 유지)
  문장 중간의 짧은 쉼 때문에 후보가 줄 수보다 많아도 알맞게 골라낸다.

사용법:
    python tools/split_narration.py batch01.mp3 --from H01 --to M01
    python tools/split_narration.py batch01.mp3 --from H01 --to M01 --dry-run
    python tools/split_narration.py all.mp3            # 전체 69줄일 때
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
PAD = 0.10
LUFS = "-16"


def load_tsv(path, comments=False):
    rows = []
    for raw in path.read_text(encoding="utf-8").splitlines():
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


def silence_midpoints(src: Path, noise: str, min_sil: float, total: float):
    """무음 구간의 중간 지점 = 자를 수 있는 후보."""
    r = subprocess.run(["ffmpeg", "-i", str(src), "-af",
                        f"silencedetect=noise={noise}:d={min_sil}", "-f", "null", "-"],
                       capture_output=True, text=True)
    starts = [float(m) for m in re.findall(r"silence_start: ([-\d.]+)", r.stderr)]
    ends = [float(m) for m in re.findall(r"silence_end: ([-\d.]+)", r.stderr)]
    cands = []
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else total
        mid = (max(0.0, s) + min(total, e)) / 2
        if 0.2 < mid < total - 0.2:
            cands.append(mid)
    return sorted(cands)


def snap_boundaries(texts, total, cands):
    """글자수 비례 예상 경계를 후보에 스냅한다 (순서 유지, 중복 금지)."""
    weights = [max(1, len(t)) for _, t in texts]
    s = sum(weights)
    expected, acc = [], 0
    for w in weights[:-1]:
        acc += w
        expected.append(total * acc / s)
    chosen, used = [], 0
    for exp in expected:
        pool = [c for c in cands[used:]]
        if not pool:
            chosen.append(exp)
            continue
        best = min(pool, key=lambda c: abs(c - exp))
        used = cands.index(best) + 1
        chosen.append(best)
    bounds = [0.0] + chosen + [total]
    for i in range(1, len(bounds)):          # 단조 증가 보정
        if bounds[i] <= bounds[i - 1]:
            bounds[i] = bounds[i - 1] + 0.05
    return bounds, expected


def main():
    ap = argparse.ArgumentParser(description="묶음 음원을 줄 단위로 자른다")
    ap.add_argument("source", type=Path)
    ap.add_argument("--from", dest="frm", help="첫 줄 ID (예: H01)")
    ap.add_argument("--to", dest="to", help="끝 줄 ID (예: M01)")
    ap.add_argument("--script", type=Path, default=SCRIPT, help="원고 TSV")
    ap.add_argument("--pronounce", type=Path, default=PRONOUNCE, help="발음 교정표")
    ap.add_argument("--outdir", type=Path, default=OUTDIR, help="자른 파일을 둘 폴더")
    ap.add_argument("--noise", default="-33dB")
    ap.add_argument("--min-sil", type=float, default=0.22)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--at", action="append", default=[], metavar="ID=초",
                    help="그 줄이 끝나는 시각을 직접 지정한다. 문장이 둘 이상인 줄은\n"
                         "중간 쉼을 문장 끝으로 잘못 고를 수 있어 이걸로 바로잡는다.")
    ap.add_argument("--auto", action="store_true",
                    help="무음 기준을 여러 값으로 시도해 가장 고른 경계를 고른다")
    a = ap.parse_args()

    if not a.source.is_file():
        sys.exit(f"[오류] 음원 없음: {a.source}")
    rows = load_tsv(a.script)
    over = dict(load_tsv(a.pronounce, comments=True)) if a.pronounce.is_file() else {}
    allt = [(p, over.get(p, t)) for p, t in rows]
    ids = [p for p, _ in allt]

    i0 = ids.index(a.frm) if a.frm else 0
    i1 = ids.index(a.to) if a.to else len(ids) - 1
    if a.frm and a.frm not in ids:
        sys.exit(f"[오류] 없는 ID: {a.frm}")
    if a.to and a.to not in ids:
        sys.exit(f"[오류] 없는 ID: {a.to}")
    if i1 < i0:
        sys.exit("[오류] --from 이 --to 보다 뒤입니다")
    texts = allt[i0:i1 + 1]

    total = duration(a.source)

    def evaluate(min_sil):
        """경계를 잡고, 줄마다 '초당 글자수'가 얼마나 고른지로 점수를 낸다."""
        c = silence_midpoints(a.source, a.noise, min_sil, total)
        if len(c) < len(texts) - 1:
            return None
        bnd, _ = snap_boundaries(texts, total, c)
        rates = [len(t) / max(0.05, bnd[i + 1] - bnd[i]) for i, (_, t) in enumerate(texts)]
        mid = sorted(rates)[len(rates) // 2]
        worst = max(max(r / mid, mid / r) for r in rates)   # 1.0 이면 완벽히 고름
        return worst, c

    if a.auto:
        best = None
        for ms in (0.12, 0.16, 0.20, 0.24, 0.28, 0.34, 0.40, 0.50):
            got = evaluate(ms)
            if got and (best is None or got[0] < best[0]):
                best = (got[0], ms, got[1])
        if best:
            print(f"  자동 선택: --min-sil {best[1]:.2f} (최악 편차 {best[0]:.2f}배)")
            a.min_sil, cands = best[1], best[2]
        else:
            cands = silence_midpoints(a.source, a.noise, a.min_sil, total)
    else:
        cands = silence_midpoints(a.source, a.noise, a.min_sil, total)
    cps = sum(len(t) for _, t in texts) / total
    print(f"음원 {total:.1f}초 / 대상 {len(texts)}줄 ({texts[0][0]}~{texts[-1][0]}) "
          f"/ 무음 후보 {len(cands)}개 / 평균 {cps:.1f}자/초")

    if cps < 2.5 or cps > 9.0:
        print(f"  [경고] 말 속도가 비정상입니다 ({cps:.1f}자/초). "
              f"음원에 든 줄과 --from/--to 가 다를 수 있습니다.")
    if len(cands) < len(texts) - 1:
        print(f"  [경고] 무음 후보({len(cands)})가 경계 수({len(texts)-1})보다 적습니다. "
              f"--min-sil {max(0.12, a.min_sil-0.08):.2f} 로 낮춰보세요.")

    bounds, expected = snap_boundaries(texts, total, cands)

    # 직접 지정한 경계를 덮어쓴다
    if a.at:
        idx = {pid: i for i, (pid, _) in enumerate(texts)}
        for item in a.at:
            k, _, v = item.partition("=")
            k = k.strip()
            if k not in idx:
                sys.exit(f"[오류] --at 의 ID 가 이 묶음에 없습니다: {k}")
            i = idx[k]
            if i == len(texts) - 1:
                sys.exit(f"[오류] 마지막 줄({k})의 끝은 지정할 수 없습니다")
            bounds[i + 1] = float(v)
            print(f"  경계 지정: {k} 끝 = {float(v):.2f}초")
        for i in range(1, len(bounds)):
            if bounds[i] <= bounds[i - 1]:
                sys.exit(f"[오류] 지정한 경계가 순서를 깨뜨립니다 ({bounds[i-1]:.2f} → {bounds[i]:.2f})")
    drift = [abs(bounds[i + 1] - expected[i]) for i in range(len(expected))]
    if drift:
        print(f"  예상 경계와의 차이: 평균 {sum(drift)/len(drift):.2f}초 / 최대 {max(drift):.2f}초")
        if max(drift) > 1.6:
            print("  [확인 필요] 한 군데 이상 크게 어긋납니다. --dry-run 으로 먼저 보세요.")

    if a.dry_run:
        for i, (pid, t) in enumerate(texts):
            s, e = bounds[i], bounds[i + 1]
            print(f"  {pid}  {s:7.2f} → {e:7.2f}  ({e-s:4.1f}s)  {t[:32]}")
        return

    a.outdir.mkdir(parents=True, exist_ok=True)
    for i, (pid, _) in enumerate(texts):
        s = max(0.0, bounds[i] - PAD)
        d = (bounds[i + 1] - bounds[i]) + PAD * 2
        dest = a.outdir / f"{pid}.mp3"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{s:.3f}",
                        "-t", f"{d:.3f}", "-i", str(a.source),
                        "-af", f"loudnorm=I={LUFS}:TP=-1.5:LRA=11",
                        "-ar", "44100", "-ac", "1", "-b:a", "128k", str(dest)],
                       check=True)
        print(f"  {pid}.mp3  {d:4.1f}s  {dest.stat().st_size // 1024}KB")
    print(f"\n{len(texts)}개 생성 → {a.outdir}/")


if __name__ == "__main__":
    main()
