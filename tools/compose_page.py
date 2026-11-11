#!/usr/bin/env python3
"""
compose_page.py — 컷 이미지를 만화 페이지로 합성한다.

- 종이 질감 크림색 배경
- 손그림 느낌의 비정형 패널 테두리 (절차적 생성, 자로 그은 직선 없음)
- 컷 이미지를 패널에 cover-fit (비율 유지 + 중앙 크롭)
- 블리드 컷(테두리 없음), 찢긴 테두리(회상) 지원

사용법:
    python tools/compose_page.py tools/layouts/page_001.json
    python tools/compose_page.py tools/layouts/page_001.json --out 04_textless_pages/page_001.png
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

# ── 기본값 (style_bible / page_layout_rules 와 일치) ──────────────────
PAPER_RGB = (232, 226, 212)          # #E8E2D4 크림색
BORDER_RGB = (36, 30, 24)            # #241E18 진한 갈색-검정
DEFAULT_CANVAS = (1536, 2304)
DEFAULT_MARGIN = 72
SUPERSAMPLE = 2                      # 테두리를 2배로 그린 뒤 축소 → 안티에일리어싱


# ── 손그림 선 ────────────────────────────────────────────────────────
def jittered_path(points, rng, amp=2.4, seg=26):
    """꼭짓점 목록을 받아, 변마다 미세하게 흔들린 점열을 만든다."""
    out = []
    n = len(points)
    for i in range(n):
        x0, y0 = points[i]
        x1, y1 = points[(i + 1) % n]
        length = math.hypot(x1 - x0, y1 - y0)
        steps = max(2, int(length / seg))
        # 변마다 완만한 휘어짐(bow)을 하나씩 준다 — 자로 그은 느낌 제거
        bow = rng.uniform(-amp, amp)
        nx, ny = -(y1 - y0) / (length or 1), (x1 - x0) / (length or 1)
        for s in range(steps):
            t = s / steps
            bend = math.sin(t * math.pi) * bow
            jx = rng.uniform(-amp * 0.5, amp * 0.5)
            jy = rng.uniform(-amp * 0.5, amp * 0.5)
            out.append((x0 + (x1 - x0) * t + nx * bend + jx,
                        y0 + (y1 - y0) * t + ny * bend + jy))
    out.append(out[0])
    return out


def draw_pressure_line(draw, path, rng, base_w=3.0, color=BORDER_RGB):
    """필압 변화가 있는 선. 구간마다 굵기를 바꿔 손그림 느낌을 낸다."""
    w = base_w
    for i in range(len(path) - 1):
        if i % 7 == 0:
            w = max(base_w * 0.55, min(base_w * 1.7, w + rng.uniform(-0.5, 0.5)))
        draw.line([path[i], path[i + 1]], fill=color, width=max(1, int(round(w))))
    for p in path[::5]:  # 이음새 메움
        r = base_w * 0.45
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)


def rect_corners(x, y, w, h, rng, skew=2.0):
    """모서리를 ±2px 흔들어 완전한 직각을 피한다."""
    j = lambda: rng.uniform(-skew, skew)
    return [(x + j(), y + j()), (x + w + j(), y + j()),
            (x + w + j(), y + h + j()), (x + j(), y + h + j())]


def torn_corners(x, y, w, h, rng, teeth=16, amp=7.0):
    """손으로 찢은 듯한 테두리 (회상 컷용)."""
    pts = []
    for (ax, ay), (bx, by) in [((x, y), (x + w, y)), ((x + w, y), (x + w, y + h)),
                               ((x + w, y + h), (x, y + h)), ((x, y + h), (x, y))]:
        for k in range(teeth):
            t = k / teeth
            px, py = ax + (bx - ax) * t, ay + (by - ay) * t
            pts.append((px + rng.uniform(-amp, amp), py + rng.uniform(-amp, amp)))
    return pts


# ── 종이 질감 ────────────────────────────────────────────────────────
def paper_background(size, rng):
    w, h = size
    base = Image.new("RGB", size, PAPER_RGB)
    # 미세 입자
    noise = Image.effect_noise((w, h), 11).convert("L")
    noise = noise.filter(ImageFilter.GaussianBlur(0.4))
    grain = Image.merge("RGB", (noise, noise, noise))
    base = Image.blend(base, grain, 0.045)
    # 아주 완만한 색 얼룩 (종이 결)
    blotch = Image.effect_noise((max(1, w // 24), max(1, h // 24)), 36).convert("L")
    blotch = blotch.resize(size, Image.BICUBIC).filter(ImageFilter.GaussianBlur(28))
    base = Image.composite(base, Image.new("RGB", size, (221, 214, 198)),
                           blotch.point(lambda v: 255 if v > 150 else 0))
    return base


# ── 컷 배치 ──────────────────────────────────────────────────────────
def cover_fit(img, box_w, box_h, anchor="center"):
    """비율 유지 + 중앙(또는 지정) 크롭으로 패널을 꽉 채운다."""
    iw, ih = img.size
    scale = max(box_w / iw, box_h / ih)
    nw, nh = max(1, int(round(iw * scale))), max(1, int(round(ih * scale)))
    img = img.resize((nw, nh), Image.LANCZOS)
    if anchor == "top":
        top = 0
    elif anchor == "bottom":
        top = nh - box_h
    else:
        top = (nh - box_h) // 2
    left = (nw - box_w) // 2
    return img.crop((left, top, left + box_w, top + box_h))


def load_panel(path, missing_ok, idx):
    p = Path(path)
    if p.is_file():
        return Image.open(p).convert("RGB")
    if not missing_ok:
        sys.exit(f"[오류] 컷 이미지가 없습니다: {p}\n  (--allow-missing 으로 자리표시자 생성 가능)")
    # 자리표시자: 번호가 보이는 회색 사각
    ph = Image.new("RGB", (832, 1216), (190, 184, 170))
    d = ImageDraw.Draw(ph)
    d.rectangle([8, 8, 823, 1207], outline=(120, 114, 100), width=4)
    d.text((40, 40), f"panel {idx:02d}\n(missing)", fill=(90, 85, 74))
    return ph


# ── 메인 ─────────────────────────────────────────────────────────────
def compose(layout_path: Path, out_path: Path | None, allow_missing: bool) -> Path:
    layout = json.loads(layout_path.read_text(encoding="utf-8"))
    canvas_w, canvas_h = layout.get("canvas", DEFAULT_CANVAS)
    rng = random.Random(layout.get("seed", 20261111))
    root = Path(layout.get("panel_root", "03_panels"))

    page = paper_background((canvas_w, canvas_h), rng)

    # 테두리는 수퍼샘플 레이어에 그린다
    S = SUPERSAMPLE
    ink = Image.new("RGBA", (canvas_w * S, canvas_h * S), (0, 0, 0, 0))
    idraw = ImageDraw.Draw(ink)

    for i, panel in enumerate(layout["panels"], start=1):
        x, y, w, h = panel["box"]
        style = panel.get("border", "hand")      # hand | torn | none
        img = load_panel(root / panel["image"], allow_missing, i)
        page.paste(cover_fit(img, w, h, panel.get("anchor", "center")), (x, y))

        if style == "none":
            continue
        if style == "torn":
            corners = torn_corners(x * S, y * S, w * S, h * S, rng,
                                   teeth=18, amp=7.0 * S)
            path = jittered_path(corners, rng, amp=1.6 * S, seg=18 * S)
            draw_pressure_line(idraw, path, rng, base_w=2.6 * S)
        else:
            corners = rect_corners(x * S, y * S, w * S, h * S, rng, skew=2.0 * S)
            path = jittered_path(corners, rng, amp=2.2 * S, seg=26 * S)
            draw_pressure_line(idraw, path, rng,
                               base_w=panel.get("border_width", 3.0) * S)

    ink = ink.resize((canvas_w, canvas_h), Image.LANCZOS)
    page = Image.alpha_composite(page.convert("RGBA"), ink).convert("RGB")

    if out_path is None:
        out_path = Path("04_textless_pages") / f"page_{layout['page']:03d}.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    page.save(out_path)
    return out_path


def main():
    ap = argparse.ArgumentParser(description="컷 이미지를 만화 페이지로 합성")
    ap.add_argument("layout", type=Path, help="레이아웃 JSON (tools/layouts/page_0XX.json)")
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--allow-missing", action="store_true",
                    help="컷 이미지가 없으면 자리표시자로 대체 (레이아웃 검증용)")
    a = ap.parse_args()
    out = compose(a.layout, a.out, a.allow_missing)
    print(f"[완료] {out}")


if __name__ == "__main__":
    main()
