#!/usr/bin/env python3
"""
build_video.py — 내레이션에 맞춘 자막형 영상을 만든다.

화면 소재(촬영분·이미지) 없이, 내레이션 문장을 타이포그래피로 보여주는
정보 영상 형식이다. 줄마다 카드 한 장을 그리고 그 줄의 길이만큼 띄운다.

  final/narration_full.mp3   음성 (build_final.py 가 만든 것)
  final/timeline.csv         줄별 타임코드
        ↓
  final/ep1_video.mp4        1920x1080

사용법:
    python tools/build_video.py
    python tools/build_video.py --card H01     # 카드 한 장만 미리보기(png)
"""
from __future__ import annotations

import argparse
import csv
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
FPS = 24
OUT = Path("final")
FONT_B = Path("assets/fonts/NanumGothic-Bold.ttf")
FONT_R = Path("assets/fonts/NanumGothic-Regular.ttf")

BG = (18, 20, 24)
BG2 = (12, 13, 16)
FG = (238, 236, 230)
DIM = (120, 124, 132)
ACCENT = (240, 180, 90)          # 숫자 강조
RULE = (52, 56, 64)

SECTIONS = {
    "H": ("", "건설 안전관리자 계급도"),
    "M": ("기준", "공사금액이 신분을 가른다"),
    "A": ("1칸", "안전감시원"),
    "B": ("2칸", "안전감시단"),
    "C": ("3칸", "작은 현장 안전 담당"),
    "D": ("4칸", "법정 안전관리자"),
    "E": ("", "다음 편"),
}
RUNG = {"A": 1, "B": 2, "C": 3, "D": 4}

# 게임 UI — 채널 컨셉(현실 RPG)에 맞춘 레벨 표시
LEVELS = {
    "H": (0, "현장 입문"), "M": (0, "현장 입문"),
    "A": (1, "안전감시원"), "B": (2, "안전감시단"),
    "C": (3, "안전 담당"),  "D": (4, "안전관리자"),
    "E": (4, "안전관리자"),
}
QUEST = {                      # 각 레벨 첫 컷에 띄우는 퀘스트 창
    "A01": ("현장에 들어가는 법을 알아보자", 100),
    "B01": ("현장 전체를 보는 자리로 올라가자", 100),
    "C01": ("작은 현장의 안전을 통째로 맡아보자", 100),
    "D01": ("선임보고서에 이름을 올려보자", 200),
}
PORTRAIT = Path("brand/assets/02_logo_circle.png")
HEART = (228, 72, 84)
EXP_BAR = (108, 196, 92)
NUM = re.compile(r"\d[\d,]*\s?(?:억|만|천|원|명|일|시|년|분기|칸|개월|배|장|%)?")


def wrap(draw, text, font, maxw):
    """어절(띄어쓰기) 단위로 끊는다. 한 어절이 한 줄보다 길면 그때만 글자 단위로 쪼갠다."""
    def w(t):
        return sum(draw.textlength(c, font=font) for c in t)

    lines, cur = [], ""
    for word in text.split(" "):
        cand = word if not cur else cur + " " + word
        if w(cand) <= maxw:
            cur = cand
            continue
        if cur:
            lines.append(cur)
            cur = ""
        if w(word) <= maxw:
            cur = word
            continue
        piece = ""                      # 어절 하나가 너무 길 때만
        for ch in word:
            if w(piece + ch) > maxw and piece:
                lines.append(piece); piece = ch
            else:
                piece += ch
        cur = piece
    if cur:
        lines.append(cur)
    return lines


def heart(d, cx, cy, r, color):
    d.ellipse([cx - r, cy - r * 0.95, cx, cy + r * 0.15], fill=color)
    d.ellipse([cx, cy - r * 0.95, cx + r, cy + r * 0.15], fill=color)
    d.polygon([(cx - r, cy - r * 0.1), (cx + r, cy - r * 0.1), (cx, cy + r)], fill=color)


def draw_hud(d, img, section: str, progress: float):
    """좌상단 게임 UI — 초상화, 레벨, 하트, 경험치 바."""
    lv, title = LEVELS.get(section, (0, ""))
    x, y = 80, 62
    box = 112
    d.rounded_rectangle([x - 6, y - 6, x + box + 6, y + box + 6], 14,
                        fill=(30, 33, 38), outline=ACCENT, width=3)
    if PORTRAIT.is_file():
        pt = Image.open(PORTRAIT).convert("RGB")
        side = min(pt.size)
        pt = pt.crop(((pt.width - side) // 2, 0, (pt.width + side) // 2, side))
        img.paste(pt.resize((box, box), Image.LANCZOS), (x, y))

    tx = x + box + 26
    f_lv = ImageFont.truetype(str(FONT_B), 42)
    label = f"Lv.{lv} {title}" if lv else f"Lv.? {title}"
    d.text((tx, y - 2), label, font=f_lv, fill=FG)

    for i in range(3):                       # 체력 하트
        heart(d, tx + 14 + i * 40, y + 62, 13, HEART)

    bx, by, bw, bh = tx, y + 86, 400, 18     # 경험치 바
    d.rounded_rectangle([bx, by, bx + bw, by + bh], 9, fill=(46, 50, 57))
    fill = int(bw * max(0.0, min(1.0, progress)))
    if fill > 6:
        d.rounded_rectangle([bx, by, bx + fill, by + bh], 9, fill=EXP_BAR)
    f_s = ImageFont.truetype(str(FONT_R), 24)
    d.text((bx + bw + 16, by - 4), f"EXP {int(progress*100)}%", font=f_s, fill=DIM)


def draw_quest(d, pid: str):
    """레벨이 바뀌는 컷에만 띄우는 퀘스트 창."""
    if pid not in QUEST:
        return
    goal, exp = QUEST[pid]
    f_h = ImageFont.truetype(str(FONT_B), 34)
    f_g = ImageFont.truetype(str(FONT_B), 40)
    f_r = ImageFont.truetype(str(FONT_R), 28)
    w = max(d.textlength(goal, font=f_g), 520) + 88
    h = 196
    x, y = (W - w) / 2, H - h - 96
    d.rounded_rectangle([x, y, x + w, y + h], 18, fill=(28, 31, 36), outline=ACCENT, width=3)
    d.polygon([(x + 44, y + 40), (x + 58, y + 26), (x + 72, y + 40), (x + 58, y + 54)], fill=ACCENT)
    d.text((x + 88, y + 22), "신규 퀘스트", font=f_h, fill=ACCENT)
    d.text((x + 44, y + 78), goal, font=f_g, fill=FG)
    d.text((x + 44, y + 136), f"보상 : 직업 지식 +{exp} EXP", font=f_r, fill=DIM)


def draw_card(text: str, section: str, progress: float = 0.0,
              pid: str = "") -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # 위아래로 아주 옅은 명암
    for y in range(H):
        k = abs(y - H / 2) / (H / 2)
        c = tuple(int(BG[i] + (BG2[i] - BG[i]) * k * 0.9) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)

    draw_hud(d, img, section, progress)
    tag, title = SECTIONS.get(section, ("", ""))
    f_tag = ImageFont.truetype(str(FONT_B), 34)
    f_title = ImageFont.truetype(str(FONT_R), 30)
    # A~D 는 레벨 이름이 곧 직급이라 머리말을 또 쓰면 겹친다
    if section not in RUNG:
        d.text((80, 214), title, font=f_title, fill=DIM)

    # 사다리 표시 (A~D 구간에서만)
    if section in RUNG:
        x0, y0, bw, bh, gap = W - 96 - (4 * 44 + 3 * 10), 92, 44, 12, 10
        for i in range(4):
            on = i < RUNG[section]
            d.rounded_rectangle([x0 + i * (bw + gap), y0, x0 + i * (bw + gap) + bw, y0 + bh],
                                4, fill=ACCENT if on else RULE)

    d.line([(80, 262), (W - 80, 262)], fill=RULE, width=2)

    # 본문 — 길이에 따라 글자 크기를 줄여 한 화면에 담는다
    maxw = W - 2 * 170
    for size in (84, 76, 68, 60, 54, 48):
        f = ImageFont.truetype(str(FONT_B), size)
        lines = wrap(d, text, f, maxw)
        lh = size * 1.52
        if len(lines) * lh <= H - 560:
            break
    total = len(lines) * lh
    y = (H - total) / 2 + 70
    for ln in lines:
        hot = set()
        for m in NUM.finditer(ln):
            hot.update(range(m.start(), m.end()))
        widths = [d.textlength(c, font=f) for c in ln]
        x = (W - sum(widths)) / 2
        for i, c in enumerate(ln):
            if c != " ":
                d.text((x, y), c, font=f, fill=ACCENT if i in hot else FG)
            x += widths[i]
        y += lh
    draw_quest(d, pid)
    return img


def main():
    ap = argparse.ArgumentParser(description="자막형 영상 생성")
    ap.add_argument("--card", metavar="ID", help="카드 한 장만 png 로 미리보기")
    ap.add_argument("--fps", type=int, default=FPS)
    ap.add_argument("--audio", type=Path, default=OUT / "narration_full.mp3",
                    help="영상에 붙일 음성 (기본: 효과음 없는 내레이션)")
    ap.add_argument("--out", type=Path, default=OUT / "ep1_video.mp4")
    a = ap.parse_args()

    tl_path = OUT / "timeline.csv"
    audio = a.audio
    if not tl_path.is_file() or not audio.is_file():
        sys.exit("[오류] final/timeline.csv 와 final/narration_full.mp3 가 필요합니다. "
                 "먼저 python tools/build_final.py 를 실행하세요.")
    rows = list(csv.DictReader(tl_path.open(encoding="utf-8-sig")))

    def sec(ts):
        h, m, s = ts.split(":"); return int(h) * 3600 + int(m) * 60 + float(s)

    if a.card:
        r = next((x for x in rows if x["ID"] == a.card), None)
        if not r:
            sys.exit(f"[오류] 없는 ID: {a.card}")
        p = OUT / f"card_{a.card}.png"
        draw_card(r["대사"], r["구간"], 0.5, a.card).save(p)
        print(f"미리보기 → {p}")
        return

    frames = OUT / "_frames"
    frames.mkdir(parents=True, exist_ok=True)
    total_dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(audio)],
        capture_output=True, text=True, check=True).stdout.strip())

    # 카드마다 '다음 줄이 시작할 때까지' 화면에 둔다
    entries = []
    for i, r in enumerate(rows):
        start = sec(r["시작"])
        end = sec(rows[i + 1]["시작"]) if i + 1 < len(rows) else total_dur
        img = draw_card(r["대사"], r["구간"], i / max(1, len(rows) - 1), r["ID"])
        f = frames / f"{i:03d}.png"
        img.save(f)
        entries.append((f, end - start))
        print(f"  카드 {r['ID']}  {end-start:4.1f}s")

    lst = frames / "list.txt"
    with lst.open("w", encoding="utf-8") as fh:
        for f, d in entries:
            fh.write(f"file '{f.resolve()}'\nduration {d:.3f}\n")
        fh.write(f"file '{entries[-1][0].resolve()}'\n")   # 마지막 장 한 번 더

    out = a.out
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                    "-f", "concat", "-safe", "0", "-i", str(lst),
                    "-i", str(audio),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(a.fps),
                    "-preset", "medium", "-crf", "20",
                    "-c:a", "aac", "-b:a", "192k",
                    "-shortest", "-movflags", "+faststart", str(out)], check=True)
    for f, _ in entries:
        f.unlink(missing_ok=True)
    lst.unlink(missing_ok=True)
    frames.rmdir()
    size = out.stat().st_size / 1024 / 1024
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                "-of", "default=nw=1:nk=1", str(out)],
                               capture_output=True, text=True, check=True).stdout.strip())
    print(f"\n{out}  {W}x{H} {a.fps}fps  {int(dur//60)}분 {dur%60:.0f}초  {size:.1f}MB")


if __name__ == "__main__":
    main()
