#!/usr/bin/env python3
"""
build_final.py — 69개 음성을 영상 편집용 최종본으로 묶는다.

만드는 것:
  final/narration_full.mp3   69줄을 자연스러운 간격으로 이어붙인 통합 내레이션
  final/timeline.csv         줄별 시작/끝/길이 타임코드 (편집 프로그램용)
  final/narration.srt        통합 음성에 맞춘 자막
  final/edit_sheet.md        사람이 읽는 편집표 (구간·누적 시간 포함)

간격 규칙: 같은 구간 안에서는 짧게, 구간이 바뀔 때는 길게 쉰다.

사용법:
    python tools/build_final.py
    python tools/build_final.py --gap 0.5 --section-gap 1.2
"""
from __future__ import annotations

import argparse
import csv
import subprocess
import sys
from pathlib import Path

SCRIPT = Path("narration/ep1_script.tsv")
PRONOUNCE = Path("narration/pronounce.tsv")
AUDIO = Path("audio")
OUT = Path("final")

SECTIONS = {
    "H": "오프닝 — 문제 제기",
    "M": "구조 설명 — 공사금액 기준",
    "A": "1칸 — 안전감시원",
    "B": "2칸 — 안전감시단",
    "C": "3칸 — 작은 현장 안전 담당",
    "D": "4칸 — 법정 안전관리자",
    "E": "마무리 — 다음 편 예고",
}


def load_tsv(path: Path, comments=False):
    rows = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw.strip() or (comments and raw.lstrip().startswith("#")):
            continue
        a, b = raw.split("\t", 1)
        rows.append((a.strip(), b.strip()))
    return rows


def dur(p: Path) -> float:
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(p)],
        capture_output=True, text=True, check=True).stdout.strip())


def tc(sec: float, srt=False) -> str:
    h = int(sec // 3600); m = int(sec % 3600 // 60); s = sec % 60
    if srt:
        return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def main():
    ap = argparse.ArgumentParser(description="영상 편집용 최종본 생성")
    ap.add_argument("--gap", type=float, default=0.45, help="같은 구간 안 줄 사이 간격(초)")
    ap.add_argument("--section-gap", type=float, default=1.0, help="구간이 바뀔 때 간격(초)")
    a = ap.parse_args()

    rows = load_tsv(SCRIPT)
    over = dict(load_tsv(PRONOUNCE, comments=True))
    items = [(p, t, over.get(p, t)) for p, t in rows]

    missing = [p for p, _, _ in items if not (AUDIO / f"{p}.mp3").is_file()]
    if missing:
        sys.exit(f"[오류] 음성이 없는 줄: {' '.join(missing)}")

    OUT.mkdir(parents=True, exist_ok=True)

    # 타임라인 계산
    timeline, cursor, prev_sec = [], 0.0, None
    for pid, text, spoken in items:
        sec = pid[0]
        if prev_sec is not None:
            cursor += a.section_gap if sec != prev_sec else a.gap
        d = dur(AUDIO / f"{pid}.mp3")
        timeline.append({"id": pid, "section": sec, "start": cursor,
                         "end": cursor + d, "dur": d, "text": text, "spoken": spoken})
        cursor += d
        prev_sec = sec
    total = cursor

    # 통합 음성 — mp3 를 이어붙이면 프레임 단위 오차가 쌓여 자막이 밀린다.
    # 각 줄을 PCM 으로 풀어 샘플 위치에 정확히 얹는다.
    import numpy as np
    SR = 44100

    def pcm(path: Path) -> "np.ndarray":
        raw = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le",
             "-acodec", "pcm_s16le", "-ar", str(SR), "-ac", "1", "-"],
            capture_output=True, check=True).stdout
        return np.frombuffer(raw, dtype="<i2")

    buf = np.zeros(int(round(total * SR)) + SR // 2, dtype=np.int32)
    for r in timeline:
        seg = pcm(AUDIO / f"{r['id']}.mp3")
        off = int(round(r["start"] * SR))
        end = min(off + seg.size, buf.size)
        buf[off:end] += seg[: end - off]
    buf = np.clip(buf, -32768, 32767).astype("<i2")
    last = int(round(timeline[-1]["end"] * SR))
    buf = buf[: last + int(0.3 * SR)]

    full = OUT / "narration_full.mp3"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR),
                    "-ac", "1", "-i", "pipe:0", "-b:a", "192k", str(full)],
                   input=buf.tobytes(), check=True)
    real = dur(full)

    # 타임코드표
    with (OUT / "timeline.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ID", "구간", "시작", "끝", "길이(초)", "파일", "대사"])
        for r in timeline:
            w.writerow([r["id"], r["section"], tc(r["start"]), tc(r["end"]),
                        f"{r['dur']:.3f}", f"audio/{r['id']}.mp3", r["text"]])

    # 자막
    with (OUT / "narration.srt").open("w", encoding="utf-8") as f:
        for i, r in enumerate(timeline, 1):
            f.write(f"{i}\n{tc(r['start'], True)} --> {tc(r['end'], True)}\n{r['text']}\n\n")

    # 편집표
    lines = ["# EP1 《계급도》 편집표", "",
             f"- 통합 내레이션: `final/narration_full.mp3` ({tc(real)})",
             f"- 줄 단위 음성: `audio/<ID>.mp3` 69개",
             f"- 줄 사이 간격 {a.gap}초 / 구간 전환 {a.section_gap}초", ""]
    cur = None
    for r in timeline:
        if r["section"] != cur:
            cur = r["section"]
            sl = [x for x in timeline if x["section"] == cur]
            lines += ["", f"## {cur} — {SECTIONS.get(cur, '')}",
                      f"`{tc(sl[0]['start'])}` ~ `{tc(sl[-1]['end'])}`  ({len(sl)}줄)", "",
                      "| ID | 시작 | 길이 | 대사 |", "|---|---|---|---|"]
        lines.append(f"| {r['id']} | `{tc(r['start'])}` | {r['dur']:.1f}s | {r['text']} |")
    (OUT / "edit_sheet.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"통합 음성 {tc(real)} (계산값 {tc(total)}) / {full.stat().st_size//1024}KB")
    print(f"  final/narration_full.mp3")
    print(f"  final/timeline.csv      ({len(timeline)}줄)")
    print(f"  final/narration.srt")
    print(f"  final/edit_sheet.md")
    for s, name in SECTIONS.items():
        sl = [x for x in timeline if x["section"] == s]
        if sl:
            print(f"    {s}  {tc(sl[0]['start'])} ~ {tc(sl[-1]['end'])}  {len(sl):2d}줄  {name}")


if __name__ == "__main__":
    main()
