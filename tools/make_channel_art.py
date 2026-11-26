#!/usr/bin/env python3
"""
make_channel_art.py — 가진 배너 그림과 로고를 유튜브 규격에 맞춰 자른다.

유튜브 채널 아트는 2560x1440 로 올리지만 기기마다 보이는 범위가 다르다.
가운데 1546x423 만 모든 기기에서 보이므로, 로고와 슬로건은 전부 그 안에 넣고
바깥은 배경으로 채운다.

  brand/banner.png        2560x1440  업로드용
  brand/banner_guide.png  안전영역 선이 그려진 확인용 (업로드 금지)
  brand/profile_full.png   800x800   로고 전체
  brand/profile_zoom.png   800x800   글자를 키운 안

사용법:
    python tools/make_channel_art.py --art <배너그림> --logo <로고>
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_B = "assets/fonts/NanumGothic-Bold.ttf"
OUT = Path("brand")
CANVAS = (2560, 1440)
SAFE = (1546, 423)
SLOGAN = "세상에서 가장 어려운 게임, 현실"
FG = (240, 238, 232)
ACCENT = (247, 190, 94)


def banner(art: Image.Image, slogan: str, guide=False):
    cw, ch = CANVAS
    sx, sy = (cw - SAFE[0]) // 2, (ch - SAFE[1]) // 2

    # 배경 — TV 처럼 전체가 보이는 화면을 위해 그림을 흐리게 깔아둔다
    bgs = art.copy()
    k = max(cw / bgs.width, ch / bgs.height)
    bgs = bgs.resize((int(bgs.width * k), int(bgs.height * k)), Image.LANCZOS)
    bgs = bgs.crop(((bgs.width - cw) // 2, (bgs.height - ch) // 2,
                    (bgs.width - cw) // 2 + cw, (bgs.height - ch) // 2 + ch))
    bgs = bgs.filter(ImageFilter.GaussianBlur(28))
    img = Image.blend(bgs, Image.new("RGB", CANVAS, (14, 15, 19)), 0.62)

    # 그림 — 안전영역 위쪽에, 아래에는 슬로건 자리를 남긴다
    art_h = 336
    art_w = int(art.width * art_h / art.height)
    a = art.resize((art_w, art_h), Image.LANCZOS)
    ax = (cw - art_w) // 2
    img.paste(a, (ax, sy))

    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT_B, 54)
    tw = d.textlength(slogan, font=f)
    ty = sy + art_h + 26
    d.text(((cw - tw) / 2 + 2, ty + 2), slogan, font=f, fill=(0, 0, 0))   # 그림자
    d.text(((cw - tw) / 2, ty), slogan, font=f, fill=FG)
    d.line([((cw - tw) / 2 - 40, ty + 30), ((cw - tw) / 2 - 16, ty + 30)], fill=ACCENT, width=4)
    d.line([((cw + tw) / 2 + 16, ty + 30), ((cw + tw) / 2 + 40, ty + 30)], fill=ACCENT, width=4)

    if guide:
        g = ImageDraw.Draw(img)
        g.rectangle([sx, sy, sx + SAFE[0], sy + SAFE[1]], outline=(230, 70, 70), width=4)
        g.text((sx + 10, sy - 46), "안전영역 1546x423 — 모든 기기에서 보이는 범위",
               font=ImageFont.truetype(FONT_B, 32), fill=(230, 70, 70))
    return img


def profile(logo: Image.Image, zoom: float):
    side = 800
    s = min(logo.size)
    c = logo.crop(((logo.width - s) // 2, (logo.height - s) // 2,
                   (logo.width + s) // 2, (logo.height + s) // 2))
    if zoom > 1.0:
        m = int(s * (1 - 1 / zoom) / 2)
        c = c.crop((m, m, s - m, s - m))
    return c.resize((side, side), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser(description="유튜브 채널 아트 생성")
    ap.add_argument("--art", required=True, type=Path, help="배너 그림 (가로 긴 원본)")
    ap.add_argument("--logo", required=True, type=Path, help="로고 (정사각)")
    ap.add_argument("--art-bottom", type=float, default=1.0,
                    help="원본에서 그림이 끝나는 세로 비율 (아래 리소스 영역 잘라낼 때)")
    ap.add_argument("--slogan", default=SLOGAN)
    a = ap.parse_args()

    art = Image.open(a.art).convert("RGB")
    if a.art_bottom < 1.0:
        art = art.crop((0, 0, art.width, int(art.height * a.art_bottom)))
    logo = Image.open(a.logo).convert("RGB")

    OUT.mkdir(exist_ok=True)
    banner(art, a.slogan).save(OUT / "banner.png")
    banner(art, a.slogan, guide=True).save(OUT / "banner_guide.png")
    profile(logo, 1.0).save(OUT / "profile_full.png")
    profile(logo, 1.35).save(OUT / "profile_zoom.png")
    for n in ("banner.png", "banner_guide.png", "profile_full.png", "profile_zoom.png"):
        p = OUT / n
        im = Image.open(p)
        print(f"  {n:20s} {im.width}x{im.height}  {p.stat().st_size//1024}KB")
    print(f"\n업로드: banner.png / profile_full.png 또는 profile_zoom.png")
    print("banner_guide.png 는 확인용입니다. 올리지 마세요.")


if __name__ == "__main__":
    main()
