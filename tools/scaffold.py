#!/usr/bin/env python3
"""
scaffold.py — page_layout_rules.md 의 설계안을 실제 좌표 JSON으로 생성한다.

  tools/layouts/page_0XX.json        (컷 배치)
  06_prompts/dialogue/page_0XX.json  (말풍선 — 자동 배치 초안)

말풍선 좌표는 '검수를 통과하는 출발점'이다. 최종 위치는 페이지를 눈으로 보고
Krita/CSP 에서, 또는 이 JSON의 box/tail_to 를 직접 수정해 다듬는다.

사용법:
    python tools/scaffold.py            # 전체 생성 (page_001 은 수동 확정본이라 건너뜀)
    python tools/scaffold.py --force    # page_001 포함 덮어쓰기
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import ImageFont

CANVAS = (1536, 2304)
MARGIN = 72
GUT_V, GUT_H = 28, 24
CONTENT_W = CANVAS[0] - MARGIN * 2          # 1392
CONTENT_H = CANVAS[1] - MARGIN * 2          # 2160
PAD_X, PAD_Y = 22, 18
SE_C = 2 ** (1 / 2.6)                       # superellipse 팽창 계수

F = "*"  # 남은 폭/높이를 채움


# ── 레이아웃 정의 ────────────────────────────────────────────────────
# row = (height, [cell, ...])
# cell = (name, width)  또는  ([(name, h), ...], width)  ← 세로 스택
LAYOUTS: dict[int, list] = {
    1: [(260, [("01", 1392)]),
        (290, [("02", 400), ("03", F)]),
        (640, [("04", 1392)]),
        (300, [("05", 1392)]),
        (230, [("06", 600), ("06b", F)]),
        (300, [("07", 468), ("08", F)])],
    2: [(250, [("01", 430), ("02", F)]),
        (560, [("03", 560), ([("04", 170), ("05", F)], F)]),
        (250, [("06", 1392)]),
        (700, [("07", 1392)]),
        (288, [("08", 1392)])],
    3: [(668, [("01", 1392)]),
        (250, [("02", 1392)]),
        (430, [("03", 900), ("04", F)]),
        (320, [("05", 690), ("06", F)]),
        (380, [("07", 1392)])],
    4: [(380, [("01", 1392)]),
        (220, [("02", 684), ("03", F)]),
        (330, [("04", 690), ("05", F)]),
        (640, [("06", 1392)]),
        (478, [("07", 1392)])],
    5: [(400, [("01", 1392)]),
        (300, [("02", 960), ("03", F)]),
        (240, [("04", 1392)]),
        (640, [("05", 1392)]),
        (468, [("06", 560), ("07", F)])],
    6: [(280, [("01", 1392)]),
        (240, [("02", 448), ("03", 448), ("04", F)]),
        (380, [("05", 900), ([("06", 232), ("07", F)], F)]),
        (1176, [("08", 1392)])],
    7: [(260, [("01", 1392)]),
        (760, [("02", 1000), ("03", F)]),
        (250, [("04", 1392)]),
        (400, [("05", 840), ("06", F)]),
        (358, [("07", 690), ("08", F)])],
    8: [(300, [("01", 330), ("02", 330), ("03", 330), ("04", F)]),
        (620, [("05", 1392)]),
        (1184, [("06", 1392)])],
    9: [(300, [("01", 600), ("02", F)]),
        (200, [("03", 1392)]),
        (640, [("04", 1392)]),
        (340, [("05", 900), ("06", F)]),
        (568, [("07", 560), ("08", F)])],
    10: [(300, [("01", 1392)]),
         (700, [("02", 1392)]),
         (380, [("03", 690), ("04", F)]),
         (696, [("05", 1392)])],
}

# 테두리 변형: 블리드(테두리 없음) / 찢긴 테두리(회상)
BORDER_OVERRIDE = {
    (5, "01"): "none", (10, "05"): "none",
    (7, "03"): "torn", (9, "06"): "torn",
}

# ── 대사 정의 ────────────────────────────────────────────────────────
# (패널 순번, 화자, 타입, [줄], 꼬리방향)  꼬리방향: in | left | right | down | up
D: dict[int, list] = {
    2: [(3, "베르타", "normal", ["이게 뭐냐."], "in"),
        (3, "마리", "off", ["쑥부쟁이요."], "right"),
        (5, "베르타", "off", ["이 책은 백 년 전 거다."], "up"),
        (5, "베르타", "off", ["이걸 그린 사람도", "누군가를 베꼈겠지."], "up"),
        (5, "베르타", "off", ["그 사람도 또", "누군가를 베꼈을 테고."], "up"),
        (6, "베르타", "off", ["실제 쑥부쟁이는", "그렇지 않아."], "left"),
        (6, "마리", "normal", ["…그럼 몇 장인데요?"], "in"),
        (7, "베르타", "normal", ["나도 모른다."], "in"),
        (7, "베르타", "emphasis", ["틀린 그림을 보고 틀린 풀을 캐면,", "사람이 죽어."], "in")],
    3: [(2, "마리", "off", ["쑥부쟁이 있어요?"], "left"),
        (2, "엘제", "normal", ["마른 것밖에 없다."], "in"),
        (2, "마리", "off", ["꽃은요?"], "left"),
        (2, "엘제", "normal", ["떨어졌지."], "in"),
        (5, "마리", "normal", ["살아 있는 건 어디 있어요?"], "in"),
        (5, "엘제", "off", ["동쪽 숲."], "left"),
        (5, "마리", "normal", ["안나 수녀님,", "숲에 가봤어요?"], "in"),
        (6, "안나", "normal", ["아뇨."], "in"),
        (6, "마리", "off", ["무서워요?"], "up"),
        (6, "안나", "soft", ["…네."], "in"),
        (7, "마리", "normal", ["그럼 혼자 가진 않을게요."], "in")],
    4: [(1, "안나", "normal", ["제가… 그 숲에 다시는", "가지 않겠다고 한 것도…", "그 때문이에요."], "in"),
        (2, "마리", "soft", ["……그렇군요."], "up"),
        (4, "안나", "normal", ["무섭지만… 그림으로는", "계속 그리고 싶다…", "그런 거죠?"], "in"),
        (4, "마리", "off", ["…네."], "right"),
        (4, "안나", "normal", ["이상하죠?"], "in"),
        (5, "마리", "normal", ["전혀요."], "in"),
        (5, "마리", "normal", ["두려운 대상일수록 더 알고 싶고…", "더 그리고 싶어지거든요."], "in"),
        (6, "안나", "normal", ["언젠가 괜찮아질 때가 오면…", "저도 같이 가요."], "in"),
        (6, "마리", "soft", ["…같이요?"], "in"),
        (7, "안나", "normal", ["네. 그때는 이번에", "제가 용기를 낼 테니까."], "in")],
    5: [(1, "마리", "off", ["숲이… 생각보다 조용하네요."], "down"),
        (2, "안나", "normal", ["조용한 게 더", "무서울 때도 있어요."], "in"),
        (4, "마리", "normal", ["안나 수녀님, 보세요."], "in"),
        (4, "마리", "normal", ["이게 진짜 쑥부쟁이예요."], "in"),
        (6, "안나", "normal", ["정말이네요…", "도감 그림이랑은 전혀 달라요."], "in"),
        (6, "마리", "off", ["이렇게 직접 봐야만", "알 수 있군요."], "right")],
    6: [(1, "안나", "normal", ["저건… 뭐죠?"], "in"),
        (5, "마리", "normal", ["수도원 방식이 아니에요."], "in"),
        (5, "마리", "normal", ["누군가 여기 있었어요."], "in"),
        (6, "안나", "soft", ["이제 돌아갈까요…?"], "right"),
        (7, "에스텔", "off", ["좋은 질문이네."], "right"),
        (8, "에스텔", "normal", ["그 꽃이 궁금해서", "여기까지 온 거지?"], "in")],
    7: [(1, "에스텔", "normal", ["그거, 한 송이처럼 보여도", "진짜로는 작은 꽃들이 모인 거야."], "in"),
        (2, "에스텔", "off", ["책 그림은", "겉모양만 흉내 내기 쉬워."], "right"),
        (4, "에스텔", "normal", ["살아 있는 걸 보지 않으면,"], "in"),
        (4, "에스텔", "normal", ["어디가 몸통이고", "어디가 가장자리인지 놓치게 되지."], "in"),
        (6, "마리", "off", ["…그래서 직접 보라고", "하신 거군요."], "up"),
        (7, "에스텔", "normal", ["응."], "in"),
        (7, "에스텔", "normal", ["그림은 눈으로 시작하지만,", "약은 손으로도 배워야 하니까."], "in")],
    8: [(5, "소년", "soft", ["저… 약초 가져왔어요."], "in"),
        (6, "에스텔", "normal", ["누가 시켰지?"], "in"),
        (6, "소년", "off", ["어머니가요. 열이 심해서…"], "down")],
    9: [(1, "소년", "normal", ["이거 맞죠?", "수도원 책 보고 캤어요."], "in"),
        (3, "에스텔", "off", ["아니. 이건 아니야."], "up"),
        (3, "마리", "off", ["왜요?"], "down"),
        (4, "에스텔", "normal", ["비슷해 보여도 달라."], "down"),
        (4, "에스텔", "normal", ["이걸 달여 먹이면 열은 못 잡고,", "속부터 망가질 수도 있어."], "down"),
        (7, "안나", "normal", ["…정말 죽을 수도 있는 거네요."], "in"),
        (8, "에스텔", "normal", ["그래서 보는 법을", "잘못 배우면 안 되는 거야."], "in")],
    10: [(1, "마리", "normal", ["저… 배우고 싶어요."], "in"),
         (1, "에스텔", "off", ["무엇을?"], "right"),
         (2, "마리", "emphasis", ["그림이 아니라,", "제대로 보는 법을요."], "in"),
         (2, "에스텔", "off", ["수도원 수녀가?"], "right"),
         (2, "마리", "normal", ["네."], "in"),
         (3, "에스텔", "off", ["그럼 다음엔", "책 말고 손부터 써."], "up"),
         (4, "안나", "normal", ["…저도 같이 있어도 되죠?"], "in"),
         (4, "에스텔", "normal", ["그건 너희가", "얼마나 버티느냐에 달렸지."], "in")],
}

# 내레이션 캡션 (말풍선 아님)
CAPTIONS: dict[int, list] = {
    10: [(5, ["그날 저는 처음으로 알았습니다."]),
         (5, ["틀린 그림은 틀린 세계를 만든다는 걸."]),
         (5, ["그리고 그 숲에는,", "아직 이름 붙지 않은 진실이 남아 있다는 걸."])],
}

SFX: dict[int, list] = {
    2: [(1, ["철컹"], 54)],
    6: [(6, ["사아—"], 48)],
    8: [(1, ["바스락"], 56)],
}


# ── 레이아웃 생성 ────────────────────────────────────────────────────
def build_layout(page: int):
    rows = LAYOUTS[page]
    panels, order = [], []
    y = MARGIN
    for h, cells in rows:
        fixed = sum(c[1] for c in cells if c[1] != F)
        n_fill = sum(1 for c in cells if c[1] == F)
        rem = CONTENT_W - fixed - GUT_H * (len(cells) - 1)
        x = MARGIN
        for name, w in cells:
            ww = rem // n_fill if w == F else w
            if isinstance(name, list):                 # 세로 스택
                sy = y
                s_fixed = sum(s[1] for s in name if s[1] != F)
                s_fill = sum(1 for s in name if s[1] == F)
                s_rem = h - s_fixed - GUT_V * (len(name) - 1)
                for sname, sh in name:
                    hh = s_rem // s_fill if sh == F else sh
                    panels.append((sname, [x, sy, ww, hh]))
                    order.append(sname)
                    sy += hh + GUT_V
            else:
                panels.append((name, [x, y, ww, hh := h]))
                order.append(name)
            x += ww + GUT_H
        y += h + GUT_V

    out = {
        "page": page, "canvas": list(CANVAS), "seed": 20261111 + page,
        "panel_root": "03_panels",
        "_note": f"p{page:03d} — tools/scaffold.py 생성. 좌표 수정 시 이 파일을 직접 편집.",
        "panels": [{
            "image": f"page_{page:03d}_panel_{nm}.png",
            "box": box,
            "border": BORDER_OVERRIDE.get((page, nm), "hand"),
            "anchor": "center",
        } for nm, box in panels],
    }
    return out, [p[1] for p in panels]


# ── 말풍선 자동 배치 ─────────────────────────────────────────────────
def text_size(lines, font, leading):
    ws, hs = [], []
    for ln in lines:
        bb = font.getbbox(ln)
        ws.append(bb[2] - bb[0]); hs.append(bb[3] - bb[1])
    lh = (max(hs) if hs else font.size) * leading
    return max(ws or [0]), lh * len(lines)


def build_dialogue(page: int, boxes, font_path: Path):
    items = D.get(page, [])
    caps = CAPTIONS.get(page, [])
    sfxs = SFX.get(page, [])

    by_panel: dict[int, list] = {}
    for it in items:
        by_panel.setdefault(it[0], []).append(it)

    # SFX 가 차지할 상단 영역을 먼저 예약한다
    reserve: dict[int, int] = {}
    for pno, lines, fs in sfxs:
        f = ImageFont.truetype(str(font_path), fs)
        _, th = text_size(lines, f, 1.2)
        reserve[pno] = int(th) + 46

    bubbles, warn = [], []
    n = 0
    for pno, group in sorted(by_panel.items()):
        if pno > len(boxes):
            warn.append(f"p{page:03d}: panel {pno} 없음 — 대사 {len(group)}개 건너뜀")
            continue
        px, py, pw, ph = boxes[pno - 1]
        r = reserve.get(pno, 0)
        py, ph = py + r, ph - r
        k = len(group)
        slot_h = ph / k
        for i, (_, speaker, typ, lines, tdir) in enumerate(group):
            n += 1
            fs = 34 if typ in ("normal", "off") else (36 if typ == "emphasis" else 30)
            # 패널이 좁으면 글자를 줄인다
            while fs > 28:
                font = ImageFont.truetype(str(font_path), fs)
                tw, th = text_size(lines, font, 1.45)
                if (tw / 2 + PAD_X) * SE_C * 2 <= pw - 40:
                    break
                fs -= 2
            font = ImageFont.truetype(str(font_path), fs)
            tw, th = text_size(lines, font, 1.45)
            half_w = (tw / 2 + PAD_X) * SE_C
            half_h = (th / 2 + PAD_Y) * SE_C
            if half_w * 2 > pw - 24:
                warn.append(f"p{page:03d} panel{pno}: 말풍선이 패널보다 넓음 — 줄을 나누세요 \"{lines[0]}\"")
            # 좌/우 교대 배치 + 세로 슬롯
            left = (i % 2 == 0)
            cx = px + half_w + 26 if left else px + pw - half_w - 26
            cy = py + slot_h * i + slot_h / 2
            cy = max(py + half_h + 10, min(py + ph - half_h - 10, cy))
            bx, by = cx - tw / 2, cy - th / 2

            if tdir == "in":
                tail = [int(cx + (60 if left else -60)), int(min(py + ph - 14, cy + half_h + 86))]
            elif tdir == "left":
                tail = [int(px - 42), int(cy + 24)]
            elif tdir == "right":
                tail = [int(px + pw + 42), int(cy + 24)]
            elif tdir == "up":
                tail = [int(cx), int(py - 36)]
            else:  # down
                tail = [int(cx), int(py + ph + 36)]

            bubbles.append({
                "id": f"p{page:03d}-b{n:02d}", "panel": pno, "speaker": speaker,
                "type": typ, "lines": lines,
                "box": [int(bx), int(by), int(tw), int(th)],
                "tail_to": tail, "font_size": fs,
                "align": "center" if len(lines) == 1 else "left",
            })

    captions = []
    if caps:
        font = ImageFont.truetype(str(font_path), 32)
        sizes = [text_size(lines, font, 1.6) for _, lines in caps]
        gap = 2 * PAD_Y + 20
        total = sum(h for _, h in sizes) + gap * (len(caps) - 1)
        pno0 = caps[0][0]
        px, py, pw, ph = boxes[pno0 - 1]
        y = py + ph - 48 - total                     # 하단에서 위로 누적
        for j, ((pno, lines), (tw, th)) in enumerate(zip(caps, sizes)):
            captions.append({
                "id": f"p{page:03d}-c{j + 1:02d}", "panel": pno, "speaker": "마리(N)",
                "type": "caption", "lines": lines,
                "box": [int(px + 56), int(y), int(tw), int(th)],
                "font_size": 32, "align": "left",
            })
            y += th + gap

    sfx = []
    for j, (pno, lines, fs) in enumerate(sfxs):
        px, py, pw, ph = boxes[pno - 1]
        font = ImageFont.truetype(str(font_path), fs)
        tw, th = text_size(lines, font, 1.2)
        sfx.append({
            "id": f"p{page:03d}-s{j + 1:02d}", "panel": pno, "speaker": "SFX",
            "type": "sfx", "lines": lines,
            "box": [int(px + 34), int(py + 24), int(tw), int(th)],
            "font_size": fs, "align": "left",
        })

    return {
        "page": page, "canvas": list(CANVAS), "seed": 7000 + page,
        "_note": "scaffold.py 자동 배치 초안. box/tail_to 를 눈으로 보고 다듬을 것.",
        "bubbles": bubbles + sfx, "captions": captions,
    }, warn


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="page_001(수동 확정본)도 덮어씀")
    a = ap.parse_args()

    sys_path = Path("assets/fonts/NanumGothic-Regular.ttf")
    if not sys_path.is_file():
        raise SystemExit("[오류] assets/fonts/NanumGothic-Regular.ttf 가 필요합니다.")

    Path("tools/layouts").mkdir(parents=True, exist_ok=True)
    Path("06_prompts/dialogue").mkdir(parents=True, exist_ok=True)

    all_warn = []
    for page in sorted(LAYOUTS):
        lay, boxes = build_layout(page)
        lp = Path(f"tools/layouts/page_{page:03d}.json")
        if page == 1 and not a.force and lp.is_file():
            print(f"page_{page:03d}: 레이아웃 유지 (수동 확정본)")
        else:
            lp.write_text(json.dumps(lay, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"page_{page:03d}: 레이아웃 {len(lay['panels'])}컷 → {lp}")

        dp = Path(f"06_prompts/dialogue/page_{page:03d}.json")
        if page == 1 and not a.force and dp.is_file():
            print(f"page_{page:03d}: 대사 유지 (수동 확정본)")
            continue
        dlg, warn = build_dialogue(page, boxes, sys_path)
        all_warn += warn
        dp.write_text(json.dumps(dlg, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"page_{page:03d}: 말풍선 {len(dlg['bubbles'])} / 캡션 {len(dlg['captions'])} → {dp}")

    for w in all_warn:
        print(f"  [경고] {w}")


if __name__ == "__main__":
    main()
