#!/usr/bin/env python3
"""
add_bubbles.py — textless 페이지에 한국어 말풍선/캡션/효과음을 합성한다.

speech_bubble_rules.md 의 규격을 코드로 구현한 것:
  - 손그림 느낌의 비정형 말풍선 (자로 그은 타원 아님)
  - 꼬리가 화자(tail_to)를 명확히 가리킴. 말풍선과 꼬리는 하나의 연속된 외곽선
  - 크림색 배경 #FDFBF4 / 갈색-검정 글자 #1F1A14 (순백·순흑 금지)
  - 종류: normal / soft(점선) / off(컷 밖 화자) / emphasis(굵게) / caption(사각) / sfx

사용법:
    python tools/add_bubbles.py 06_prompts/dialogue/page_001.json
    python tools/add_bubbles.py 06_prompts/dialogue/page_001.json --check   # 검수만
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# ── 규격 상수 (speech_bubble_rules.md 와 일치) ───────────────────────
BUBBLE_FILL = (253, 251, 244)     # #FDFBF4
BORDER_RGB = (36, 30, 24)         # #241E18
TEXT_RGB = (31, 26, 20)           # #1F1A14
SFX_RGB = (58, 51, 42)            # #3A332A
PAD_X, PAD_Y = 22, 18             # 내부 여백
MIN_FONT = 28
MAX_LINES = 3
MAX_CHARS = 14
MIN_GAP = 16                      # 말풍선 간 최소 간격
SUPERELLIPSE_N = 2.6              # 말풍선 형태 지수 (사각에 가깝게 감싼다)
SS = 2                            # 수퍼샘플 배율

FONT_DIR = Path("assets/fonts")
FONT_CANDIDATES = {
    "regular": [
        FONT_DIR / "NanumGothic-Regular.ttf",
        FONT_DIR / "Pretendard-Regular.otf",
        Path("C:/Windows/Fonts/malgun.ttf"),
        Path("/System/Library/Fonts/AppleSDGothicNeo.ttc"),
        Path("/usr/share/fonts/truetype/nanum/NanumGothic.ttf"),
    ],
    "bold": [
        FONT_DIR / "NanumGothic-Bold.ttf",
        FONT_DIR / "Pretendard-Bold.otf",
        Path("C:/Windows/Fonts/malgunbd.ttf"),
        Path("/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf"),
    ],
}


def find_font(weight="regular"):
    for p in FONT_CANDIDATES[weight]:
        if p.is_file():
            return p
    if weight == "bold":
        return find_font("regular")
    sys.exit(
        "[오류] 한국어 폰트를 찾지 못했습니다.\n"
        "  assets/fonts/ 에 NanumGothic-Regular.ttf 또는 Pretendard-Regular.otf 를 두세요.\n"
        "  (Windows 는 C:/Windows/Fonts/malgun.ttf 를 자동으로 씁니다)"
    )


# ── 형태 생성 ────────────────────────────────────────────────────────
def superellipse_pts(cx, cy, a, b, rng, steps=168, jitter=1.8):
    """사각 텍스트 블록을 알맞게 감싸는 비정형 둥근 형태."""
    n = SUPERELLIPSE_N
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        ct, st = math.cos(t), math.sin(t)
        x = a * math.copysign(abs(ct) ** (2 / n), ct)
        y = b * math.copysign(abs(st) ** (2 / n), st)
        # 완만한 휘어짐 + 미세 떨림 → 손그림
        wob = 1.0 + 0.022 * math.sin(t * 3 + rng.random())
        pts.append((cx + x * wob + rng.uniform(-jitter, jitter),
                    cy + y * wob + rng.uniform(-jitter, jitter)))
    return pts


def fit_axes(w, h):
    """w×h 텍스트 블록을 포함하는 최소 superellipse 반축."""
    c = 2 ** (1 / SUPERELLIPSE_N)
    return (w / 2 + PAD_X) * c, (h / 2 + PAD_Y) * c


def splice_tail(pts, cx, cy, target, base_w=17.0, max_len=118.0):
    """말풍선 외곽선에 꼬리를 끼워 넣어 하나의 연속 폴리곤을 만든다."""
    tx, ty = target
    ang = math.atan2(ty - cy, tx - cx)
    # 꼬리 방향에 가장 가까운 외곽점 찾기
    best, bd = 0, 9e9
    for i, (px, py) in enumerate(pts):
        d = abs(((math.atan2(py - cy, px - cx) - ang + math.pi) % (2 * math.pi)) - math.pi)
        if d < bd:
            best, bd = i, d
    n = len(pts)
    step_len = 2 * math.pi * max(1.0, math.hypot(
        pts[best][0] - cx, pts[best][1] - cy)) / n
    span = max(1, int(round(base_w / max(1.0, step_len))))
    i0, i1 = (best - span) % n, (best + span) % n
    # 꼬리 끝은 화자 좌표. 너무 멀면 살짝 당긴다
    ex, ey = pts[best]
    dist = math.hypot(tx - ex, ty - ey)
    if dist > max_len:
        k = max_len / dist
        tx, ty = ex + (tx - ex) * k, ey + (ty - ey) * k
    apex = (tx, ty)
    out = []
    i = i1
    while True:
        out.append(pts[i])
        if i == i0:
            break
        i = (i + 1) % n
    out.append(apex)
    return out


def jittered_rect(x, y, w, h, rng, skew=2.5):
    j = lambda: rng.uniform(-skew, skew)
    pts = []
    corners = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    for k in range(4):
        ax, ay = corners[k]
        bx, by = corners[(k + 1) % 4]
        steps = max(2, int(math.hypot(bx - ax, by - ay) / 22))
        for s in range(steps):
            t = s / steps
            pts.append((ax + (bx - ax) * t + j(), ay + (by - ay) * t + j()))
    return pts


def stroke(draw, pts, rng, width=3.0, color=BORDER_RGB, dashed=False):
    """필압 변화가 있는 손그림 선. dashed=True 면 점선(작은 소리용)."""
    w = width
    closed = pts + [pts[0]]
    for i in range(len(closed) - 1):
        if dashed and (i // 3) % 2 == 1:
            continue
        if i % 6 == 0:
            w = max(width * 0.6, min(width * 1.6, w + rng.uniform(-0.45, 0.45)))
        draw.line([closed[i], closed[i + 1]], fill=color, width=max(1, int(round(w))))
        if not dashed:
            r = w * 0.45
            p = closed[i]
            draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)


# ── 텍스트 측정 ──────────────────────────────────────────────────────
def measure(lines, font, leading):
    widths, hs = [], []
    for ln in lines:
        bb = font.getbbox(ln)
        widths.append(bb[2] - bb[0])
        hs.append(bb[3] - bb[1])
    line_h = (max(hs) if hs else font.size) * leading
    return max(widths or [0]), line_h * len(lines), line_h


# ── 검수 ─────────────────────────────────────────────────────────────
def validate(spec):
    errs, warns = [], []
    boxes = []
    for b in list(spec.get("bubbles", [])) + list(spec.get("captions", [])):
        bid = b.get("id", "?")
        typ = b.get("type", "normal")
        lines = b.get("lines", [])
        fs = b.get("font_size", 36)

        if fs < MIN_FONT:
            errs.append(f"{bid}: 폰트 {fs}px < 최소 {MIN_FONT}px")
        if len(lines) > MAX_LINES:
            errs.append(f"{bid}: {len(lines)}줄 > 최대 {MAX_LINES}줄 — 말풍선을 나누세요")
        for ln in lines:
            if len(ln) > MAX_CHARS and typ != "caption":
                warns.append(f"{bid}: 한 줄 {len(ln)}자 > 권장 {MAX_CHARS}자 — \"{ln}\"")
        if typ not in ("caption", "sfx") and not b.get("tail_to"):
            errs.append(f"{bid}: tail_to 없음 — 화자가 불분명해집니다")
        if typ == "caption" and b.get("tail_to"):
            errs.append(f"{bid}: caption 에는 꼬리를 쓰지 않습니다")
        for ln in lines:
            if "..." in ln:
                errs.append(f"{bid}: '...' 대신 '…'(U+2026) 을 쓰세요 — \"{ln}\"")
        if b.get("speaker") == "에스텔":
            for ln in lines:
                if any(t in ln for t in ("세요", "습니다", "십니까", "어요?", "예요", "입니다", "네요")):
                    errs.append(f"{bid}: 에스텔은 반말 고정 — 존댓말 의심: \"{ln}\"")
        x, y, w, h = b.get("box", [0, 0, 0, 0])
        boxes.append((bid, x, y, w, h))

    # 겹침 검사
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            a, b_ = boxes[i], boxes[j]
            ax, ay, aw, ah = a[1], a[2], a[3], a[4]
            bx, by, bw, bh = b_[1], b_[2], b_[3], b_[4]
            ox = min(ax + aw, bx + bw) - max(ax, bx)
            oy = min(ay + ah, by + bh) - max(ay, by)
            if ox > -MIN_GAP and oy > -MIN_GAP:
                errs.append(f"{a[0]} ↔ {b_[0]}: 말풍선 간격이 {MIN_GAP}px 미만 (겹침 위험)")
    return errs, warns


# ── 합성 ─────────────────────────────────────────────────────────────
def render(spec, src: Path, out: Path) -> Path:
    page = Image.open(src).convert("RGBA")
    W, H = page.size
    rng = random.Random(spec.get("seed", 7000 + spec.get("page", 1)))

    shapes = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shapes)
    text_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(text_layer)

    f_reg, f_bold = find_font("regular"), find_font("bold")

    items = list(spec.get("bubbles", [])) + list(spec.get("captions", []))
    for b in items:
        typ = b.get("type", "normal")
        lines = b.get("lines", [])
        if not lines:
            continue
        fs = int(b.get("font_size", 36))
        leading = 1.6 if typ == "caption" else 1.45
        bold = typ in ("emphasis", "sfx")
        font = ImageFont.truetype(str(f_bold if bold else f_reg), fs)
        tw, th, line_h = measure(lines, font, leading)

        x, y, bw, bh = b.get("box", [0, 0, tw, th])
        bw, bh = max(bw, tw), max(bh, th)
        cx, cy = x + bw / 2, y + bh / 2

        # ── 배경 형태
        if typ == "caption":
            pts = jittered_rect((x - PAD_X) * SS, (y - PAD_Y) * SS,
                                (bw + 2 * PAD_X) * SS, (bh + 2 * PAD_Y) * SS, rng)
            sd.polygon(pts, fill=BUBBLE_FILL + (236,))
            stroke(sd, pts, rng, width=2.4 * SS)
        elif typ == "sfx":
            pass  # 효과음은 말풍선 없음
        else:
            a, bb_ = fit_axes(bw, bh)
            pts = superellipse_pts(cx * SS, cy * SS, a * SS, bb_ * SS, rng,
                                   jitter=1.15 * SS)
            if b.get("tail_to"):
                t = b["tail_to"]
                pts = splice_tail(pts, cx * SS, cy * SS, (t[0] * SS, t[1] * SS),
                                  base_w=17.0 * SS, max_len=118.0 * SS)
            sd.polygon(pts, fill=BUBBLE_FILL + (252,))
            stroke(sd, pts, rng,
                   width=(4.0 if typ == "emphasis" else 3.0) * SS,
                   dashed=(typ == "soft"))

        # ── 글자
        color = SFX_RGB if typ == "sfx" else TEXT_RGB
        align = b.get("align", "center")
        ty = y + (bh - th) / 2
        for ln in lines:
            lw = font.getbbox(ln)[2] - font.getbbox(ln)[0]
            if align == "left":
                lx = x
            elif align == "right":
                lx = x + bw - lw
            else:
                lx = x + (bw - lw) / 2
            if typ == "sfx":
                for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
                    td.text((lx + dx, ty + dy), ln, font=font, fill=BUBBLE_FILL + (150,))
            td.text((lx, ty), ln, font=font, fill=color + (255,))
            ty += line_h

    shapes = shapes.resize((W, H), Image.LANCZOS)
    page = Image.alpha_composite(page, shapes)
    page = Image.alpha_composite(page, text_layer)

    out.parent.mkdir(parents=True, exist_ok=True)
    page.convert("RGB").save(out)
    return out


def main():
    ap = argparse.ArgumentParser(description="textless 페이지에 말풍선/텍스트 합성")
    ap.add_argument("dialogue", type=Path, help="대사 JSON (06_prompts/dialogue/page_0XX.json)")
    ap.add_argument("--src", type=Path, default=None, help="기본: 04_textless_pages/page_0XX.png")
    ap.add_argument("--out", type=Path, default=None, help="기본: 05_final_pages/page_0XX.png")
    ap.add_argument("--check", action="store_true", help="합성하지 않고 검수만")
    a = ap.parse_args()

    spec = json.loads(a.dialogue.read_text(encoding="utf-8"))
    pg = spec.get("page", 1)

    errs, warns = validate(spec)
    for w in warns:
        print(f"  [경고] {w}")
    for e in errs:
        print(f"  [오류] {e}")
    print(f"검수: 오류 {len(errs)}건 / 경고 {len(warns)}건")
    if a.check:
        sys.exit(1 if errs else 0)
    if errs:
        sys.exit("[중단] 오류를 먼저 고치세요. (--check 로 재확인)")

    src = a.src or Path("04_textless_pages") / f"page_{pg:03d}.png"
    if not src.is_file():
        sys.exit(f"[오류] textless 페이지가 없습니다: {src}")
    out = a.out or Path("05_final_pages") / f"page_{pg:03d}.png"
    print(f"[완료] {render(spec, src, out)}")


if __name__ == "__main__":
    main()
