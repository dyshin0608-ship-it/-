# CHARACTER SHEET PROMPTS — 캐릭터 시트 생성 계획

> **모든 페이지 작업보다 먼저 이것을 완료한다.**
> 시트가 흔들리면 72컷이 전부 흔들린다.

---

## 0. 생성 순서 및 산출물

| 순서 | 캐릭터 | 산출물 | 비고 |
|---|---|---|---|
| 1 | — | `style_anchor_01~06.png` | **스타일 먼저 확정** |
| 2 | 마리 | `marie_sheet.png` + `marie_face_01~03.png` | 주인공 |
| 3 | 안나 | `anna_sheet.png` + `anna_body_01~03.png` | **체형 시트 별도 필수** |
| 4 | 에스텔 | `estelle_sheet.png` + `estelle_pose_01~04.png` | **포즈 시트 별도 필수** |
| 5 | 베르타 | `berta_sheet.png` | 흉터 디테일 포함 |
| 6 | 엘제 | `else_sheet.png` | 간소화 가능 |
| 7 | 소년 | `boy_sheet.png` | 간소화 가능 |
| 8 | — | `props_sheet.png` | 소품 |

---

## STEP 1. 스타일 앵커 (가장 먼저, 6장)

캐릭터 없이 **스타일만** 확정한다. 이 6장이 전 작품의 기준이다.

### anchor_01 — 질감 테스트 (정물)
```
[STYLE_BLOCK]
insert detail shot, isolated still life on a wooden monastery desk:
an open aged herbal codex with faded pigments, a quill, a clay inkpot,
a bundle of dried purple aster, scattered parchment,
long low morning sunbeams from the left, dust motes glowing,
extreme texture focus: paper tooth, dry brush on wood, ink bleed, oil impasto highlights,
no characters, no people
```
**검수**: 붓자국이 보이는가 / 종이 올이 느껴지는가 / 매끈하지 않은가

### anchor_02 — 공간과 빛 (필경실)
```
[STYLE_BLOCK] + [SETTING: SCRIPTORIUM] + [LIGHT: 아침 필경실]
extreme long shot, high angle establishing view of the scriptorium,
rows of empty wooden desks, towering windows, strong visible light shafts,
no characters, atmosphere only
```
**검수**: 공기감 / 원경 번짐 / 색온도

### anchor_03 — 숲의 색
```
[STYLE_BLOCK] + [SETTING: EAST FOREST] + [LIGHT: 숲 오후]
extreme long shot, deep forest interior, golden light shafts through canopy,
moss and fallen leaves, pale purple wild asters in undergrowth, no characters
```
**검수**: 초록+보라+황금 팔레트가 조화로운가

### anchor_04 — 꽃 매크로 (1화 핵심 모티프)
```
[STYLE_BLOCK]
extreme close-up macro of a wild aster flower head,
dozens of thin pale violet ray petals radiating outward,
dense cluster of small yellow disc florets at the center,
painterly botanical illustration quality, visible brush strokes,
single soft light shaft isolating the flower, green shade falloff behind
```
**검수**: 설상화가 **셀 수 없이 많게** 보이는가 (5장처럼 보이면 실패)

### anchor_05 — 패널 테두리 테스트
```
[STYLE_BLOCK]
a single hand-drawn comic panel border on cream paper,
irregular slightly wavering ink border with varying line weight,
hand-torn uneven edge quality, no ruler-straight lines,
empty inside, paper grain visible
```
→ 생성 결과를 참고해 **최종 테두리는 `tools/compose_page.py`로 절차적 생성**

### anchor_06 — 인물 실루엣 질감 (얼굴 없이)
```
[STYLE_BLOCK]
medium shot from behind, a nun in a greyish-brown linen habit and white veil,
back view only, no face visible,
focus on fabric texture: coarse linen weave, soft wool drape, folds,
warm backlight rim on the veil edge
```
**검수**: 옷 재질이 피부·머리카락과 다른 터치인가

---

## STEP 2. 마리 시트

### 2-1. 메인 시트 (`marie_sheet.png`) — 1344×768 가로, 3분할
```
[STYLE_BLOCK]
character reference sheet, three views of the same single character side by side on cream paper,
left: front view full body / center: three-quarter view full body / right: side profile full body,
consistent identical character in all three views,
[MARIE 블록]
neutral standing pose, arms relaxed at sides, holding a small brush in right hand,
even soft studio-like painterly lighting, plain warm cream background,
full body head to toe visible in all three views,
textless, no text, no labels
```
**NEGATIVE**: `[NEGATIVE_BLOCK]` + `glamorous, voluptuous, wide smile, brown hair, blue eyes, multiple different characters, inconsistent design`

### 2-2. 표정 시트 (`marie_face_01.png`) — 1024×1024, 2×3 그리드
```
[STYLE_BLOCK]
expression reference sheet, six close-up portraits of the same single character
arranged in a two by three grid on cream paper,
[MARIE 블록]
six expressions, all subtle and restrained:
(1) calm neutral, (2) quiet concentration while drawing,
(3) subtle surprise with widened eyes and held breath (mouth barely open),
(4) faint small smile with only slight lip corner raise,
(5) quiet shock, eyes unfocused,
(6) quiet determination, steady gaze,
identical face structure in all six, only expression changes,
even painterly lighting, textless
```
> **핵심**: 마리는 표정 폭이 작다. 입이 크게 벌어지는 표정이 나오면 재생성.

### 2-3. 손 시트 (`marie_face_02.png` → `marie_hands.png`) — 1024×1024
```
[STYLE_BLOCK]
hand reference sheet, six insert detail studies of the same slender female hands
with dark ink stains on fingertips and back of hand, arranged on cream paper:
(1) holding a brush in writing grip, (2) gripping a sketchbook edge tightly,
(3) fingertip gently touching a leaf, (4) crumbling dried herb stems in palm,
(5) hand frozen mid-stroke above parchment, (6) adjusting a linen veil,
anatomically correct five fingers each, painterly texture, textless
```

### 2-4. 의상 디테일 (`marie_face_03.png` → `marie_costume.png`)
```
[STYLE_BLOCK]
costume detail sheet on cream paper: a nun's working habit,
greyish-brown linen with faint purple undertone, rolled sleeves,
white linen veil with simple band, rope belt,
four detail studies: sleeve cuff, veil edge and band, belt knot, hem,
fabric weave texture clearly visible, textless
```

---

## STEP 3. 안나 시트 — **체형 고정이 최우선**

### 3-1. 메인 시트 (`anna_sheet.png`) — 1344×768 가로, 3분할
```
[STYLE_BLOCK]
character reference sheet, three views of the same single character side by side on cream paper,
left: front view full body / center: three-quarter view full body / right: side profile full body,
consistent identical character in all three views,
[ANNA 블록]
neutral standing pose, hands clasped softly in front,
curvy full-figured healthy adult silhouette clearly readable through the loose habit,
modest loose flowing clothing, no tight fabric, no clinging,
even soft painterly lighting, plain warm cream background,
full body head to toe visible, textless
```
**NEGATIVE**: `[NEGATIVE_BLOCK]` + `skinny, flat chest, thin body, slim, seductive, cleavage, tight dress, clinging fabric, brown hair, red hair`

### 3-2. 체형 시트 (`anna_body_01.png`) — **별도 필수** 1024×1536
```
[STYLE_BLOCK]
full body silhouette study sheet of the same single character, three poses on cream paper:
standing relaxed / seated on a wooden stool / walking mid-stride,
[ANNA 블록]
emphasis on consistent curvy full-figured wholesome adult proportions in all three,
soft shoulder and waist curves read through loose linen drape,
warm comforting healthy build, completely modest clothing,
even painterly lighting, textless
```
> **이 시트가 모든 안나 컷의 체형 기준이다.** 컷 생성 시 IP-Adapter 가중치 0.80으로 투입.

### 3-3. 표정 시트 (`anna_body_02.png` → `anna_faces.png`) — 1024×1024, 2×3
```
[STYLE_BLOCK]
expression reference sheet, six close-up portraits of the same single character in a two by three grid,
[ANNA 블록]
six expressions:
(1) warm gentle neutral, (2) bright curiosity with raised brows,
(3) suppressed laughter, lips pressed, eyes crinkled,
(4) hesitant fear, gaze lowered and away, shoulders slightly inward,
(5) quiet dawning understanding, (6) gentle resolve with a small smile,
identical rounded face and rosy cheeks in all six,
NOT seductive, NOT flirtatious, no wink, warm and wholesome,
even painterly lighting, textless
```

### 3-4. 포즈 시트 (`anna_body_03.png` → `anna_poses.png`) — **반신샷 반복 방지용** 1344×768
```
[STYLE_BLOCK]
pose reference sheet, six poses of the same single character on cream paper:
(1) chin resting on hand at a desk, (2) leaning body toward someone to the side,
(3) both hands clasped tight at chest, (4) reclining back against a chair,
(5) crouching down beside someone, hands on knees,
(6) seen from behind, shoulder turned, looking back,
[ANNA 블록]
consistent curvy full-figured build in every pose, modest loose habit,
varied dynamic body axes, textless
```

---

## STEP 4. 에스텔 시트 — **도적 느낌 제거가 최우선**

### 4-1. 메인 시트 (`estelle_sheet.png`) — 1344×768 가로, 3분할
```
[STYLE_BLOCK]
character reference sheet, three views of the same single character side by side on cream paper,
left: front view full body / center: three-quarter view full body / right: side profile full body,
consistent identical character in all three views,
[ESTELLE 블록]
relaxed standing pose with open shoulders, one hand holding a sprig of herbs,
wide-brimmed purple witch hat with wild flowers clearly visible in all views,
tall elegant 171cm proportions,
serene welcoming apothecary presence, NOT rogue, NOT assassin, no hood, no dagger,
no leather belts, no mask, eye level framing not low angle,
even soft painterly lighting, plain warm cream background, textless
```
**NEGATIVE**: `[NEGATIVE_BLOCK]` + `rogue, assassin, thief, hood, hooded cloak, dagger, knife, multiple leather belts, mask, armor, intimidating, menacing, low angle, crossed arms, no hat, platinum white hair, short hair`

### 4-2. 모자 디테일 (`estelle_hat.png`) — 1024×1024
```
[STYLE_BLOCK]
prop detail sheet: a wide-brimmed soft purple witch hat on cream paper,
four views: front, side, three-quarter, and top-down,
real wild forest flowers tucked into the hat band — pale violet asters,
small pink wildflowers, a sprig of green herb,
soft worn felt texture, slightly drooping brim, painterly, textless
```
> 모자는 에스텔의 **1차 식별자**. 모든 컷에서 꽃이 보여야 한다.

### 4-3. 포즈 시트 (`estelle_pose_01.png`) — **자세 반복 방지용 필수** 1344×768
```
[STYLE_BLOCK]
pose reference sheet, six poses of the same single character on cream paper:
(1) leaning loosely against a tree trunk,
(2) sitting on a boulder with one leg extended,
(3) holding a flower up on an open palm to show someone,
(4) beckoning with a relaxed hand gesture,
(5) crouching low, lifting plants aside with fingers,
(6) walking away while turning the shoulder to look back,
[ESTELLE 블록]
relaxed languid herbalist energy in every pose, NOT rogue, no hood, no dagger,
hat with flowers visible in all six, textless
```

### 4-4. 표정 시트 (`estelle_pose_02.png` → `estelle_faces.png`) — 1024×1024, 2×3
```
[STYLE_BLOCK]
expression reference sheet, six close-up portraits of the same single character in a two by three grid,
[ESTELLE 블록]
six expressions:
(1) languid serene neutral, (2) amused interest, slight smirk,
(3) warm teasing with a tilted head, (4) genuinely focused and intelligent,
(5) suddenly serious, eyes sharpening (wary, NOT hostile),
(6) quiet testing appraisal,
identical elegant face with drooping relaxed eyelids in all six, hat brim visible,
even painterly lighting, textless
```

### 4-5. 키 비교 시트 (`estelle_pose_03.png` → `height_chart.png`) — **중요** 1344×768
```
[STYLE_BLOCK]
height comparison chart on cream paper, six full-body figures standing in a row,
all drawn to the same scale, strictly ordered tallest to shortest:
a tall 171cm blonde witch in a purple flowered hat,
a stern 165cm abbess in black habit,
a curvy 162cm blonde nun in cream habit,
a petite slim 158cm black-haired nun in greyish-brown habit,
a thin 155cm elderly nun in brown work habit,
a 142cm village boy with a basket,
consistent scale and ground line, simple neutral poses, textless, no numbers, no labels
```
> 이 시트를 2인 이상 컷 생성 시 ControlNet/구도 참고로 쓴다.

---

## STEP 5. 조연 시트

### 베르타 (`berta_sheet.png`) — 1344×768, 3분할
```
[STYLE_BLOCK]
character reference sheet, three views of the same single character side by side on cream paper,
front / three-quarter / side profile, full body, consistent in all three,
[BERTA 블록]
upright authoritative standing pose, hands folded,
wooden cross and iron key ring clearly visible,
plus one inset insert detail of the back of her left hand showing an old burn scar,
even painterly lighting, textless
```

### 엘제 (`else_sheet.png`) — 1024×1024, 2분할
```
[STYLE_BLOCK]
character reference sheet, two views of the same single character on cream paper,
front view full body and three-quarter working pose (bundling dried herbs),
[ELSE 블록]
plus one insert detail of rough calloused working hands,
even painterly lighting, textless
```

### 소년 (`boy_sheet.png`) — 1024×1024, 2분할
```
[STYLE_BLOCK]
character reference sheet, two views of the same single character on cream paper,
front view full body and three-quarter view clutching a willow basket of herbs,
[BOY 블록]
plus two expression insets: hopeful/eager, and crumbling disappointment,
even painterly lighting, textless
```

---

## STEP 6. 소품 시트 (`props_sheet.png`) — 1344×768

```
[STYLE_BLOCK]
prop reference sheet on cream paper, eight isolated object studies:
(1) an aged herbal codex open to a botanical plate of a purple flower,
(2) a quill and a clay inkpot,
(3) a small leather-bound sketchbook,
(4) a bundle of dried aster stems, brittle and crumbling,
(5) a woven willow basket filled with cut herbs,
(6) a ring of heavy iron keys,
(7) a short length of purple thread tied around a tree twig,
(8) a live wild aster flower head with many thin violet ray petals,
painterly botanical illustration quality, visible brush strokes, textless, no labels
```

> **(1)과 (8)의 대비가 1화의 주제다.** 반드시 같은 시트 안에서 생성해 비교 가능하게.

---

## STEP 7. 시트 확정 절차

1. 각 시트를 **4~6장 배치 생성** (시드만 변경)
2. 눈으로 1장 선정 → `01_references/` 에 확정 파일명으로 저장
3. 선정한 **시드 값을 `01_references/seeds.json` 에 기록**
4. 확정 후 **시트는 다시 생성하지 않는다** (에피소드 종료까지 동결)

### seeds.json 기록 예
```json
{
  "style_anchor": {"seed": 123456, "model": "<checkpoint>", "cfg": 6.0, "steps": 32},
  "marie":   {"seed": 0, "sheet": "marie_sheet.png",   "ipa_weight": 0.75, "locked": false},
  "anna":    {"seed": 0, "sheet": "anna_sheet.png",    "body_sheet": "anna_body_01.png", "ipa_weight": 0.80, "locked": false},
  "estelle": {"seed": 0, "sheet": "estelle_sheet.png", "pose_sheet": "estelle_pose_01.png", "ipa_weight": 0.75, "locked": false},
  "berta":   {"seed": 0, "sheet": "berta_sheet.png",   "ipa_weight": 0.70, "locked": false},
  "else":    {"seed": 0, "sheet": "else_sheet.png",    "ipa_weight": 0.65, "locked": false},
  "boy":     {"seed": 0, "sheet": "boy_sheet.png",     "ipa_weight": 0.65, "locked": false}
}
```

### 시트 합격 기준
- [ ] 3개 뷰의 인물이 **같은 사람**으로 보이는가
- [ ] 머리색·눈색이 정확한가
- [ ] 의상 색과 형태가 바이블과 일치하는가
- [ ] 손가락 개수가 정상인가
- [ ] 붓자국·종이 질감이 살아 있는가
- [ ] 글자가 들어가지 않았는가
- [ ] **안나**: 체형이 충분히 풍만하고, 동시에 노골적이지 않은가
- [ ] **에스텔**: 도적처럼 보이지 않고, 모자에 꽃이 있는가
- [ ] **마리**: 청초하고 표정 폭이 절제되었는가
