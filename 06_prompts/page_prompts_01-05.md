# PAGE PROMPTS p001 ~ p005

## 사용법

각 컷의 프롬프트는 **조립식**이다. `prompt_templates.md` 의 블록을 치환해서 쓴다.

```
FINAL = [STYLE_BLOCK] + [SHOT] + [CHAR...] + <ACTION 아래 표의 영문> + [SETTING] + [LIGHT] + [TEXTLESS: safe]
NEG   = [NEGATIVE_BLOCK] + <등장 캐릭터별 추가 네거티브>
```

- **ACTION**: 컷마다 다른 부분. 이 문서의 핵심
- **safe**: 말풍선 안전영역 위치 → `[TEXTLESS_BLOCK]` 의 `{POSITION}` 에 삽입
- 대사는 **생성 프롬프트에 넣지 않는다.** 아래 「대사 분리본」 참조 → `dialogue/page_0XX.json`

---
---

# PAGE 001 — 필경실 아침

**공통**: `SETTING = SCRIPTORIUM`, `LIGHT = 아침 필경실`

| # | SHOT | CHAR | ACTION (프롬프트에 삽입) | safe |
|---|---|---|---|---|
| 1 | ELS + HIGH | — | `rows of nuns seated at wooden desks copying manuscripts in silence, repetitive labour, one lone figure at the far desk painting instead of writing, floating dust motes caught in long light shafts, quiet reverent atmosphere, no faces discernible at this distance` | upper third |
| 2 | INS | — | `tight still life on the desk corner: a quill resting on parchment, a clay inkpot with dried ink rim, a brittle bundle of dried purple aster, three clearly different material textures side by side` | — (대사 없음) |
| 3 | OTS | MARIE | `over-the-shoulder from behind a seated figure's shoulder, looking down at Marie bent low over her work, painting a botanical plate, her white veil slipping forward over one cheek, brush held steady, utterly absorbed` | upper right |
| 4 | **FS 정면 평면** | — | `flat frontal view of a finished botanical plate on aged parchment, a painted purple aster rendered with exactly five broad distinct petals, neat and confident and beautifully executed, handwritten annotation marks beside it (illegible scribble marks only, NOT readable letters), the drawing is the sole subject filling the frame, warm parchment cream, ink navy linework, faded violet pigment` | lower right |
| 5 | BS | ANNA | `Anna seated at the adjoining desk, chin resting on her hand, leaning her upper body toward Marie's desk, holding a small memo slip up close to her eyes, bright curiosity with raised brows, rosy cheeks, loose blonde curls escaping her veil, warm window light from behind catching the curls` | upper left |
| 6 | INS + CU | — | `extreme tight insert of two handwritten characters on a small memo slip, deliberately shaky uneven strokes, the two marks look almost but not quite identical, abstract ink marks only (NOT readable text), paper fibre visible, ink slightly bled` | right side |
| 7 | CU | MARIE | `close insert of Marie's slender hand frozen mid-stroke above the parchment, brush held in a writing grip, dark ink stains on the fingertips and back of the hand, the hand has stopped moving, tension in the knuckles` | upper left |
| 8 | MS 2인 | MARIE + ANNA | `two-shot, Anna on the left suppressing laughter with pressed lips and crinkled eyes, Marie on the right pointedly not looking at her, picking her brush back up and resuming work with studied indifference, Marie three-quarter turned away, Anna leaning in, clear depth between them, warm shared light` | upper third |

### 대사 분리본 (page_001)
```
[panel 5]
안나  마리 수녀님, 이 풀 이름이 뭐라고요?
마리  거기 적어뒀는데요.
안나  네. 그걸 읽고 있는데요.

[panel 6]
안나  이 두 글자, 같은 글자예요?
마리  네. 둘 다 '뿌리'요.
안나  하나는 '뿔' 같은데요.

[panel 7]
마리  손이 시려서요.

[panel 8]
안나  오늘 안 춥잖아요.
마리  어제 쓴 거예요.
```
> **panel 4 주의**: "다섯 장의 꽃잎"이 **또렷하게 다섯 장**이어야 한다. 이것이 1화의 "틀린 그림"이며 p005-5, p009-4와 대조된다. 꽃잎이 많게 나오면 재생성.

---
---

# PAGE 002 — 베르타의 등장

**공통**: `SETTING = SCRIPTORIUM`, `LIGHT = 서늘한 권위` (1~2번은 아침 필경실 유지, 3번부터 전환)

| # | SHOT | CHAR | ACTION | safe |
|---|---|---|---|---|
| 1 | INS + CU | — | `tight insert of a ring of heavy iron keys hanging at a waist, mid-swing, motion implied, black wool habit behind them, no face no head in frame, cold metal glint against matte black cloth` | right side |
| 2 | LS | — | `row of seated nuns straightening their backs in unison, a wave of tension passing down the row, heads lowering back to their work, seen from the side, the approaching figure not yet visible in frame` | upper third |
| 3 | FS 눈높이 | BERTA | `Berta standing at the near end of the desk, full body at eye level, hands folded, looking down at the work on the desk, her shadow falling across the parchment, perfectly still, no anger only weight` | upper right |
| 4 | INS + ECU | BERTA | `extreme close insert of the back of an older woman's left hand resting on aged parchment, a large old burn scar across the back of the hand, shiny taut scar tissue against weathered skin, fingers relaxed, the scar is the subject` | — |
| 5 | HIGH | — | `high angle looking down at an aged herbal codex opened flat, a hundred years old, scratched and stained vellum, faded pigments, a botanical plate of a purple flower visible on the page, a hand lifting the edge of the page, cool shadow across half the spread` | upper left |
| 6 | CU | MARIE | `close-up of Marie looking up, eyes widening slightly, lips barely parted, breath held, almost no other facial movement, the cool shadow has reached her face, amber eyes catching the last warm light` | upper right |
| 7 | **MS 2인** | BERTA + MARIE | `two-shot, Berta in the foreground already turned away mid-stride toward the door, only her black-clad back and veil visible, deliberately exiting, Marie beyond her in the middle ground facing camera, left without an answer, the composition weighted toward the empty space Berta is leaving, strong contrast between her black habit and the pale window light` | upper third |
| 8 | LS | MARIE + ANNA | `wide shot of the scriptorium after the door has closed, Marie and Anna small in frame still at their desks, the other nuns gone or heads down, the warm morning light now gone cool and grey, long empty shadows, silence` | upper third |

### 대사 분리본 (page_002)
```
[panel 1]  (SFX) 철컹

[panel 3]
베르타  이게 뭐냐.
마리    쑥부쟁이요.

[panel 5]
베르타  이 책은 백 년 전 거다.
베르타  이걸 그린 사람도 누군가를 베꼈겠지.
베르타  그 사람도 또 누군가를 베꼈을 테고.

[panel 6]
베르타  실제 쑥부쟁이는 그렇지 않아.
마리    …그럼 몇 장인데요?

[panel 7]
베르타  나도 모른다.
베르타  틀린 그림을 보고 틀린 풀을 캐면, 사람이 죽어.   ← emphasis 말풍선

[panel 8]  (무대사)
```
> **panel 7**: 베르타 말풍선 2개. 꼬리는 **컷 밖(문 방향)** 으로. 위압이 아니라 **공백**의 연출.

---
---

# PAGE 003 — 약초 건조실

**공통**: `SETTING = DRYING ROOM`, `LIGHT = 역광 건조실`

| # | SHOT | CHAR | ACTION | safe |
|---|---|---|---|---|
| 1 | **LS + LOW** | — | `low angle looking up into the drying room, dozens of herb bundles hanging upside down from dark ceiling beams filling the upper frame, strong backlight from a small high window behind them, glowing airborne dust and herb powder, deep silhouettes, cathedral-like but humble` | lower third |
| 2 | MS | ELSE | `Else at a low wooden workbench, hands never stopping, tying and sorting dried stems, answering without looking up, weathered practical face in rim light, herb dust on her apron, utterly unhurried` | upper right |
| 3 | **ECU** | MARIE | `extreme close-up of Marie's cupped hand, a dried aster stem crumbling apart between her fingers, brittle fragments and dust falling, the flower head already disintegrated so no petals can be counted, ink stains on the fingertips, single hard backlight catching the falling dust` | upper left |
| 4 | INS | — | `tight insert of the stone floor, scattered crumbled herb fragments and fine dust where they landed, a shallow pool of backlight` | — |
| 5 | BS | MARIE | `Marie lifting her head and turning to look back over her shoulder at someone behind her, the turn is the action, backlight rimming her black hair and veil edge, face half in shadow` | upper right |
| 6 | CU + HIGH | ANNA | `high angle close-up looking down at Anna, her gaze dropping to the floor and away, both hands drawing together and clasping tight at her chest, shoulders rolling slightly inward, caught out, rosy cheeks gone pale in the dim light, quiet fear surfacing` | upper left |
| 7 | MS 2인 | MARIE + ANNA | `two-shot, Marie having taken one step closer but stopping at a respectful arm's length, not pressing, Anna still looking down, the space between them deliberately kept, soft bounced backlight filling the gap, gentle and unforced` | upper third |

### 대사 분리본 (page_003)
```
[panel 2]
마리  쑥부쟁이 있어요?
엘제  마른 것밖에 없다.
마리  꽃은요?
엘제  떨어졌지.

[panel 3]  (무대사 — 부스러짐)

[panel 5]
마리  살아 있는 건 어디 있어요?
엘제  동쪽 숲.
마리  안나 수녀님, 숲에 가봤어요?

[panel 6]
안나  아뇨.
마리  무서워요?
안나  …네.                                  ← soft 말풍선 (점선)

[panel 7]
마리  그럼 혼자 가진 않을게요.
```
> **panel 2**: 말풍선 4개가 한 컷에 들어간다. 마리는 컷 밖(좌측) 화자 → 꼬리를 컷 경계 밖으로. 엘제는 화면 안. 읽는 순서 좌상→우하 보장.

---
---

# PAGE 004 — 회랑과 약속

**공통**: `SETTING = CLOISTER`, `LIGHT = 회랑`

| # | SHOT | CHAR | ACTION | safe |
|---|---|---|---|---|
| 1 | LS | MARIE + ANNA | `long shot from behind, two nuns walking away down an arched stone colonnade, alternating bands of hard light and shadow crossing them as they pass each column, Anna half a step behind, courtyard garden glimpsed through the arches, hazy backlight at the far end` | upper third |
| 2 | INS | MARIE | `tight insert of a pair of feet in simple leather sandals on worn flagstones, mid-step but stopped, the habit hem settling, a band of light across the stone` | upper left |
| 3 | INS | ANNA | `tight insert of a second pair of feet on flagstones, stopped, one hand's fingers gripping a fistful of skirt fabric entering frame from above, tension in the grip` | upper right |
| 4 | MS 측면 | ANNA | `profile medium shot, Anna leaning her shoulder against a stone column, looking straight ahead at nothing rather than at the person beside her, speaking to the air, gentle and careful, hard-edged light band falling across her eyes` | upper left |
| 5 | CU | MARIE | `close-up of Marie speaking clearly for the first time, chin level, no hesitation, a rare steadiness in the amber eyes, soft bounce light from the sunlit courtyard filling her face` | upper right |
| 6 | **MS 2인 역광** | MARIE + ANNA | `two-shot, the first time the two meet each other's eyes directly, standing between two columns, strong backlight haze flooding from the courtyard behind them, dust and pollen floating in the shaft, their faces warmly rim-lit and softly shadowed, an arm's length apart, no touching, quiet trust forming` | upper third |
| 7 | BS | ANNA | `Anna turning her face a little away while smiling, a small resolved smile, cheeks flushed deeper, one hand at the knot of her veil band, light band grazing her jaw` | upper left |

### 대사 분리본 (page_004)
```
[panel 1]
안나  제가… 그 숲에 다시는 가지 않겠다고 한 것도… 그 때문이에요.

[panel 2]
마리  ……그렇군요.                            ← soft 말풍선

[panel 3]  (무대사)

[panel 4]
안나  무섭지만… 그림으로는 계속 그리고 싶다… 그런 거죠?
마리  …네.
안나  이상하죠?

[panel 5]
마리  전혀요.
마리  두려운 대상일수록 더 알고 싶고…
      더 그리고 싶어지거든요.

[panel 6]
안나  언젠가 괜찮아질 때가 오면… 저도 같이 가요.
마리  …같이요?

[panel 7]
안나  네. 그때는 이번에 제가 용기를 낼 테니까.
```
> **panel 4·6**: 마리는 컷 안에 없거나 작게 — 꼬리를 컷 밖으로 빼서 화자 혼동 방지.
> **panel 5**: 말풍선 2개로 분리. 2번째를 2줄로 (의미 단위 줄바꿈 준수).

---
---

# PAGE 005 — 숲길과 실제 쑥부쟁이

**공통**: `SETTING = EAST FOREST`, `LIGHT = 숲 오후`

| # | SHOT | CHAR | ACTION | safe |
|---|---|---|---|---|
| 1 | **ELS + WIDE** | MARIE + ANNA | `extreme long shot horizontal panoramic, the deep east forest opening up, towering old trees, dense green canopy, broad golden light shafts cutting down through the leaves, two tiny nun figures entering at the lower edge of frame, overwhelming scale, the colour temperature and saturation jump dramatically compared to the monastery, humid atmospheric depth. borderless bleed composition` | upper third |
| 2 | FS 뒷모습 2인 | MARIE + ANNA | `full shot from behind, the two walking a narrow forest path, Anna half a step behind and slightly off the path, one hand gripping her skirt, Marie ahead looking around at everything, dappled light moving over their backs and veils` | upper left |
| 3 | INS | — | `tight insert of the forest floor: wet fallen leaves, thick moss over a root, a few tiny unremarkable wildflowers, dappled light, rich wet earth texture` | — |
| 4 | MS | MARIE | `Marie stopping mid-step, body already turning down toward the ground, eyes locked on something below frame, the observer's instinct firing, her hand half-raised, veil swinging slightly from the sudden stop` | upper right |
| 5 | **ECU** | — | `extreme close-up macro of a single living wild aster flower head in the undergrowth, dozens upon dozens of very thin pale violet ray petals radiating outward in overlapping layers, far too many to count, a dense tight cluster of tiny yellow disc florets packed at the center, botanically accurate and painterly, one soft light shaft isolating it, green shade falling away behind, dew on a petal edge. framed flat and frontal to match an illustration plate` | upper left |
| 6 | BS | ANNA | `Anna bending down from the waist to look closely at the flower, fear briefly forgotten, genuine wonder on her rounded face, loose curls falling forward past her cheek, dappled light speckling her veil` | upper right |
| 7 | MS 2인 | MARIE + ANNA | `two-shot, Marie kneeling on the moss with her small sketchbook open on her knee already drawing, utterly absorbed, Anna seated beside her on a root simply watching her draw, no dialogue, late afternoon light warming both of them, the forest quiet and safe for this one moment` | upper third |

### 대사 분리본 (page_005)
```
[panel 1]
마리  숲이… 생각보다 조용하네요.

[panel 2]
안나  조용한 게 더 무서울 때도 있어요.

[panel 4]
마리  안나 수녀님, 보세요.
마리  이게 진짜 쑥부쟁이예요.

[panel 5]  (무대사 — 꽃만)

[panel 6]
안나  정말이네요… 도감 그림이랑은 전혀 달라요.
마리  이렇게 직접 봐야만 알 수 있군요.

[panel 7]  (무대사 — 여백)
```
> **panel 5가 1화 최대 설득력 컷.** 생성 후 반드시 `p001-4`(다섯 장 도해)와 **나란히 놓고** 확인한다. 설상화가 셀 수 없이 많아 보이지 않으면 재생성.
> panel 5는 안전영역을 좁게(15%) 둔다 — 꽃을 최대한 크게.
