# PROMPT TEMPLATES — 《숲의 약방》

> **STYLE_BLOCK과 NEGATIVE_BLOCK은 수정 금지.**
> 수정하면 스타일 드리프트가 발생한다. 변경이 필요하면 에피소드 단위로만, 변경 이력을 아래에 기록한다.

| 버전 | 날짜 | 변경 | 적용 범위 |
|---|---|---|---|
| v1.0 | 2026-11-11 | 초안 확정 | EP01 전체 |

---

## 1. STYLE_BLOCK (모든 프롬프트 선두에 고정 삽입)

```
hand-painted fantasy illustration, traditional mixed media look,
oil paint and watercolor and ink and colored pencil combined,
visible brush strokes, visible paper grain and tooth, painterly texture,
soft ink bleed, dry brush texture on stone and wood, wet-on-wet soft edges in distance,
hand-drawn linework slightly loose and imperfect, line and color not perfectly aligned,
painterly cinematic lighting, warm golden amber light, volumetric light shafts, atmospheric depth,
storybook fantasy concept art, mature artistic quality, European medieval monastery setting,
muted but rich palette, warm color temperature,
subject sharp in foreground with softer midground and hazy background
```

**압축 버전** (토큰 제한 시):
```
hand-painted fantasy illustration, oil watercolor ink mixed media,
visible brush strokes, paper grain texture, loose hand-drawn linework,
painterly warm golden cinematic light, muted rich palette, storybook concept art, mature artistry
```

---

## 2. NEGATIVE_BLOCK (모든 프롬프트에 고정)

```
text, letters, words, korean text, japanese text, chinese text, signature, watermark, logo,
speech bubble, caption, subtitle, typography, handwriting,
glossy, plastic skin, airbrushed, smooth gradient skin, 3d render, cgi, octane render,
subsurface scattering, specular highlight, lens flare, bloom overload, sparkle particles,
photorealistic, photograph, realistic photo, hyperrealism,
anime screencap, cel shaded, flat vector, clean lineart, crisp digital lineart,
romance fantasy novel cover, light novel cover, gacha game art, idol illustration,
oversharpened, hdr, oversaturated, neon,
deformed hands, extra fingers, fused fingers, extra limbs, bad anatomy, malformed face,
asymmetric eyes, cross-eyed, lazy eye,
dirty, muddy colors, noise, jpeg artifacts, blurry overall,
rigid rectangular panel grid, ruler-straight panel borders,
nsfw, cleavage, revealing clothing, skin-tight clothing, suggestive pose, lewd
```

**캐릭터별 추가 네거티브**
| 캐릭터 | 추가 |
|---|---|
| 마리 | `glamorous, voluptuous, wide smile, exaggerated expression, brown hair, blue eyes` |
| 안나 | `skinny, flat chest, thin body, seductive, wink, tongue out, cleavage, tight dress, brown hair` |
| 에스텔 | `rogue, assassin, thief, hood, hooded cloak, dagger, multiple leather belts, masked, intimidating low angle, crossed arms, no hat, platinum white hair` |
| 베르타 | `white hair visible, smiling, gentle, young` |
| 엘제 | `young, plump, elegant` |
| 소년 | `teenager, adult, muscular, confident` |

---

## 3. CHARACTER_BLOCK (해당 캐릭터 등장 시 삽입)

### 마리 (MARIE)
```
Marie, 22 year old nun, petite slim slender build 158cm,
long flowing black hair with natural soft waves, amber golden-brown eyes,
delicate quiet beautiful face, thin jawline, small refined nose and lips,
calm cool composed subtle expression, minimal facial movement, expressive eyes,
greyish-brown purple-tinted working habit with rolled sleeves, white linen veil,
dark ink stains on fingertips and back of hand
```

### 안나 (ANNA)
```
Anna, 24 year old nun, curvy full-figured healthy adult woman 162cm,
soft rounded face, flushed rosy cheeks, voluminous curly blonde hair with loose strands escaping veil,
bright blue-grey large round eyes, warm gentle curious expression,
cream loose flowing linen habit, veil with very subtle soft floral pattern,
wholesome warm comforting build shown through silhouette, modest loose clothing,
plump warm hands
```

### 에스텔 (ESTELLE)
```
Estelle, 27 year old forest herbalist witch, tall 171cm, well-balanced adult figure,
long loose silver-blonde ash hair, golden hazel eyes that shift green in light,
elegant languid intelligent face, gently drooping relaxed eyelids,
wide-brimmed purple witch hat decorated with real wild forest flowers on the brim,
layered violet purple and ivory linen robes with draped shawl, herb pouch at waist,
serene relaxed welcoming apothecary presence, open shoulders, at ease
```

### 베르타 (BERTA)
```
Berta, 58 year old abbess, 165cm, black habit and black veil, almost no white hair visible,
wooden cross on chest, ring of iron keys at waist,
old burn scar on the back of her left hand,
deep wrinkles, unwavering dark grey eyes, thin pressed lips, calm authority without anger
```

### 엘제 (ELSE)
```
Else, 62 year old herb-drying nun, thin wiry build 155cm,
greying hair tied tightly back, earthy brown work habit, herb-dusted apron,
weathered sun-tanned practical face, rough calloused hands with short nails, always working
```

### 소년 (BOY)
```
village boy about 12 years old, 142cm, short brown hair, brown eyes,
faded beige tunic, worn trousers with patched knees, old leather shoes,
clutching a woven willow basket of herbs to his chest,
earnest naive face with anxious worried eyes
```

---

## 4. SETTING_BLOCK (장소별)

### 필경실 (SCRIPTORIUM)
```
medieval monastery scriptorium interior, long tall windows,
dramatic shafts of warm morning sunlight with floating dust motes,
rows of wooden writing desks, parchment sheets, quills, inkpots,
hanging bundles of dried herbs, worn stone floor,
warm wood brown and stone grey and parchment cream palette, ink navy accents
```

### 약초 건조실 (DRYING ROOM)
```
monastery herb drying room, dozens of herb bundles hanging upside down from ceiling beams,
strong backlight through small high window, thick dust and herb powder in the air,
low wooden workbench, clay jars, woven baskets,
amber brown and dusty gold palette, strong backlit silhouettes
```

### 회랑 (CLOISTER)
```
medieval monastery cloister, arched stone colonnade,
alternating bands of light and shadow between columns,
inner courtyard garden glimpsed through arches, worn flagstones,
warm stone and cool shadow contrast, backlit haze
```

### 동쪽 숲 (EAST FOREST)
```
deep temperate east forest, tall old trees, dense green canopy,
golden light shafts piercing through leaves, moss covered ground, fallen leaves,
pale purple wild aster flowers scattered in undergrowth,
rich green and violet and golden palette, humid atmospheric depth
```

### 숲 속 약방 주변 (APOTHECARY GROVE)
```
small clearing deep in the forest, hints of a herbalist's presence,
drying herbs tied to branches, purple thread markers, a worn stone bowl,
dappled light, violet and moss green and ivory palette, calm secret atmosphere
```

---

## 5. 프롬프트 조립 순서 (필수)

```
[STYLE_BLOCK]
+ [SHOT_BLOCK]        ← 샷 종류 / 앵글 / 구도
+ [CHARACTER_BLOCK]   ← 등장 캐릭터 (최대 2명 권장)
+ [ACTION_BLOCK]      ← 동작 / 감정 / 시선
+ [SETTING_BLOCK]     ← 장소
+ [LIGHT_BLOCK]       ← 조명
+ [TEXTLESS_BLOCK]    ← 말풍선 안전영역
```

### TEXTLESS_BLOCK (모든 컷 고정)
```
textless, no text, no letters, no speech bubbles,
clear empty negative space in the {POSITION} for later text overlay,
composition keeps faces unobstructed
```
`{POSITION}` = `upper third` / `upper left` / `upper right` / `lower third` / `left side` / `right side`

---

## 6. SHOT_BLOCK 사전

| 약어 | 프롬프트 문구 |
|---|---|
| ELS | `extreme long shot, vast establishing view, subject tiny in frame, wide panoramic` |
| LS | `long shot, full environment visible, figures small` |
| FS | `full shot, full body in frame head to toe` |
| MS | `medium shot, waist up` |
| BS | `bust shot, chest and head` |
| CU | `close-up, head and shoulders, face fills much of frame` |
| ECU | `extreme close-up, macro detail, extremely shallow depth` |
| OTS | `over-the-shoulder shot, foreground shoulder blurred, subject beyond` |
| TOP | `top-down overhead shot, looking straight down` |
| LOW | `low angle looking up` |
| HIGH | `high angle looking down` |
| INS | `insert detail shot, isolated object or hand, tight framing` |
| WIDE | `horizontal wide panoramic composition, cinematic letterbox framing` |

---

## 7. LIGHT_BLOCK 사전

| 상황 | 프롬프트 |
|---|---|
| 아침 필경실 | `long low morning sunbeams through tall windows, strong visible light shafts, dust motes glowing, warm amber key light from left` |
| 서늘한 권위 | `cool shadow falling across the desk, key light dimmed, desaturated cool grey shift` |
| 역광 건조실 | `strong backlight from high window, rim-lit silhouettes, glowing dust, deep foreground shadow` |
| 회랑 | `alternating hard light and shadow bands through arches, hazy backlight, warm stone bounce` |
| 숲 오후 | `golden hour light shafts piercing canopy, dappled light on forest floor, humid glow, green bounce light` |
| 숲 발견 | `single soft light shaft isolating the flower, surrounding falloff into green shade` |
| 엔딩 전경 | `wide low golden sunbeams crossing the entire forest, atmospheric haze, silhouetted canopy` |

---

## 8. 생성 파라미터 (EP01 동결 — 변경 금지)

| 항목 | 값 | 비고 |
|---|---|---|
| 베이스 모델 | SDXL 계열 회화풍 체크포인트 1개 선정 후 **동결** | 추천: 유화/수채 성향 SDXL 머지 |
| VAE | 모델 내장 또는 `sdxl_vae.safetensors` **동결** | |
| 샘플러 | `DPM++ 2M SDE Karras` | |
| Steps | 30~34 | |
| CFG | 5.5~6.5 (회화 질감 보존, 7 이상은 선이 딱딱해짐) | |
| 해상도 | 세로 832×1216 / 가로 1344×768 | |
| Clip skip | 2 | |
| 업스케일 | ×1.5, `4x-UltraSharp` 금지 → 질감 보존형 사용 | |
| Denoise (업스케일) | 0.28~0.35 | 넘으면 질감이 재생성됨 |

### 레퍼런스 가중치
| 용도 | 노드 | 가중치 |
|---|---|---|
| 캐릭터 일관성 | IP-Adapter (FaceID 또는 Plus) | 마리 0.75 / 안나 0.80 / 에스텔 0.75 / 조연 0.65 |
| 스타일 앵커 | IP-Adapter (스타일 전용, 직전 페이지) | 0.30~0.40 |
| 구도 고정 | ControlNet (scribble 또는 depth, 러프 투입) | 0.55~0.70 |

> **안나의 IP-Adapter 가중치를 가장 높게.** 체형 드리프트가 가장 잘 일어난다.

---

## 9. 프롬프트 작성 체크리스트

컷 프롬프트를 쓸 때마다 확인한다.

- [ ] 장면 목적이 한 줄로 정리되어 있는가
- [ ] 등장인물이 명시되었는가 (2명 초과 시 분리 생성 고려)
- [ ] 감정 상태가 들어 있는가
- [ ] 샷 종류가 명시되었는가
- [ ] 배경이 명시되었는가
- [ ] 조명이 명시되었는가
- [ ] 질감 키워드(STYLE_BLOCK)가 선두에 있는가
- [ ] 패널 느낌 / 안전영역이 지정되었는가
- [ ] 금지 요소(NEGATIVE_BLOCK + 캐릭터별)가 들어갔는가
- [ ] 에스텔 컷에 `NOT rogue, no hood, no dagger` 가 있는가
- [ ] 안나 컷에 `curvy full-figured` + `modest loose clothing` 가 함께 있는가
