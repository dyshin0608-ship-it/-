# LOCAL AI PIPELINE — 로컬 제작 파이프라인

## 0. 대상 환경

| 항목 | 사양 | 판정 |
|---|---|---|
| CPU | Intel i7 13세대 | 충분 |
| GPU | **RTX 4070 Ti 12GB** | SDXL 단일 생성에 충분. FLUX full은 버거움 |
| PSU | 1000W | 충분 |
| 권장 RAM | 32GB 이상 | 모델 스왑 시 필요 |
| 권장 저장 | SSD 여유 200GB 이상 | 체크포인트 6~7GB × 여러 개 |

### VRAM 12GB의 현실적 한계
- SDXL 1024×1024 생성: **여유 있음** (약 7~9GB)
- SDXL + ControlNet 1개 + IP-Adapter 2개: **약 10~11GB. 한계선**
- SDXL 1536×2304 직접 생성: **불가** (타일 업스케일로 우회)
- FLUX.1-dev full(fp16): **불가** → fp8 또는 GGUF Q4/Q5로만 가능
- → **결론: SDXL 중심 + 타일 업스케일. 컷 단위 생성 후 조합.**

---

## 1. 소프트웨어 구성

### 1-1. 핵심
| 용도 | 선택 | 비고 |
|---|---|---|
| 생성 엔진 | **ComfyUI** | 노드 기반. 일관성 워크플로우에 필수 |
| 노드 관리 | ComfyUI-Manager | 커스텀 노드 설치 |
| 캐릭터 일관성 | **ComfyUI_IPAdapter_plus** | 최우선 |
| 구도 고정 | **comfyui_controlnet_aux** | depth / scribble / lineart |
| 업스케일 | ComfyUI_UltimateSDUpscale | 타일 업스케일 (12GB 필수) |
| 유틸 | ComfyUI-Custom-Scripts, rgthree-comfy | 워크플로우 정리 |
| 후처리 | **Python + Pillow** (`tools/`) | 말풍선·페이지 합성 |
| 수동 보정 | **Krita** (무료) 또는 Clip Studio Paint | 손그림 말풍선 다듬기 |

### 1-2. 모델 (다운로드 목록)
| 종류 | 추천 | 크기 |
|---|---|---|
| 베이스 체크포인트 | SDXL 기반 **유화/회화풍** 머지 1개 선정 후 **동결** | ~6.5GB |
| VAE | `sdxl_vae.safetensors` | ~335MB |
| IP-Adapter | `ip-adapter-plus_sdxl_vit-h.safetensors` (일관성) | ~1GB |
| IP-Adapter (얼굴) | `ip-adapter-faceid-plusv2_sdxl.bin` + LoRA | ~1.5GB |
| CLIP Vision | `CLIP-ViT-H-14-laion2B-s32B-b79K` | ~2.5GB |
| ControlNet | SDXL용 `depth` + `scribble`(또는 lineart) | 각 ~2.5GB |
| 업스케일러 | `4x_foolhardy_Remacri` 또는 `4x-AnimeSharp` | ~65MB |

> **업스케일러 주의**: `4x-UltraSharp` 는 질감을 과하게 깎아 **붓자국을 지운다.** 금지.
> 회화 질감 보존에는 `Remacri` 계열 + 낮은 denoise 조합이 유리.

### 1-3. 체크포인트 선정 절차 (중요)
1. 유화/수채 성향 SDXL 체크포인트 **3~4개** 후보 다운로드
2. 각 체크포인트로 `character_sheet_prompts.md` 의 **anchor_01(정물)** 과 **anchor_04(꽃 매크로)** 를 동일 시드로 생성
3. 비교 기준: 붓자국 / 종이 질감 / 광택 없음 / 색감
4. **1개 선정 → 에피소드 종료까지 동결.** `01_references/seeds.json` 에 모델명·해시 기록

---

## 2. 전체 파이프라인 (9단계)

```
STEP 0  환경 구축 + 체크포인트 선정/동결
          ↓
STEP 1  스타일 앵커 6장 생성          → 01_references/style_anchor_01~06.png
          ↓
STEP 2  캐릭터 시트 생성 + 시드 동결  → 01_references/*_sheet.png, seeds.json
          ↓
STEP 3  컷 러프 생성 (저해상, 구도 확정) → 03_panels/*_rough.png
          ↓
STEP 4  컷 최종 생성 (832×1216 / 1344×768) → 03_panels/page_0XX_panel_0Y.png
          ↓
STEP 5  2인 컷 얼굴 인페인팅
          ↓
STEP 6  컷 업스케일 ×1.5 (질감 보존)
          ↓
STEP 7  페이지 합성 (손그림 테두리)   → 04_textless_pages/page_0XX.png
          ↓
STEP 8  말풍선 + 텍스트 합성          → 05_final_pages/page_0XX.png
          ↓
STEP 9  최종 검수 (consistency_checklist.md)
```

---

## 3. 단계별 상세

### STEP 1 — 스타일 앵커 (예상 소요: 2~3시간)
- `character_sheet_prompts.md` STEP 1의 6개 프롬프트
- 각 6~8장 배치 생성 → 1장씩 선정
- **이 단계를 건너뛰면 전체가 흔들린다.** 반드시 먼저.
- 파라미터: 1024×1024 또는 1024×1536, steps 32, CFG 6.0

### STEP 2 — 캐릭터 시트 (예상 소요: 1~2일)
- `character_sheet_prompts.md` STEP 2~6
- 각 시트 4~6장 배치 → 1장 선정 → 시드 기록 → **동결**
- 가로 3분할 시트는 1344×768 로 생성
- 생성 후 **얼굴 부분만 crop** 해서 `*_face_ref.png` 로 따로 저장 (IP-Adapter 투입용)

```
01_references/
  marie_sheet.png        ← 3뷰 전신
  marie_face_ref.png     ← 얼굴만 crop (IP-Adapter 투입용) ★
  marie_faces.png        ← 표정 6종
  marie_hands.png
  anna_sheet.png
  anna_face_ref.png      ★
  anna_body_01.png       ← 체형 기준 ★★
  anna_poses.png
  estelle_sheet.png
  estelle_face_ref.png   ★
  estelle_pose_01.png
  estelle_hat.png
  height_chart.png       ← 2인+ 컷 구도용 ★
  ...
```

### STEP 3 — 컷 러프 (예상 소요: 1일)
- 목적: **구도 확정**. 화질은 무시
- 해상도 512×768, steps 14, CFG 5.0 → 빠르게 많이
- 컷당 4~6장 생성 후 1장 선정
- 선정한 러프를 **ControlNet scribble 입력**으로 STEP 4에 넘긴다
- 러프 단계에서 `page_layout_rules.md` 의 레이아웃 설계안과 **종횡비가 맞는지** 확인

### STEP 4 — 컷 최종 생성 (예상 소요: 3~4일)
#### 워크플로우 노드 구성
```
[Checkpoint Loader] ── [CLIP Text Encode: POSITIVE]
                   └── [CLIP Text Encode: NEGATIVE]
                              ↓
[Load Image: 러프] → [ControlNet Preprocessor: scribble] → [Apply ControlNet] (strength 0.60)
                              ↓
[Load Image: 캐릭터 face_ref] → [IPAdapter Plus] (weight 0.75~0.80)
                              ↓
[Load Image: 직전 페이지] → [IPAdapter Style Only] (weight 0.35)
                              ↓
[Empty Latent 832×1216] → [KSampler: DPM++2M SDE Karras, 32, CFG 6.0] → [VAE Decode] → [Save]
```
- 컷당 4~8장 생성 → 1장 선정
- **선정 기준은 예쁨이 아니라 일관성.** 캐릭터가 맞으면 조금 덜 예뻐도 그걸 쓴다
- 생성 즉시 `consistency_checklist.md` 의 컷 단위 3종 체크 (머리색/눈색/체형)

#### VRAM 관리 (12GB)
- ControlNet 1개 + IP-Adapter 2개 = 한계선. **3개 이상 동시 투입 금지**
- 2인 컷은 IP-Adapter를 1개만 걸고 → STEP 5에서 나머지 얼굴 인페인팅
- `--lowvram` 플래그는 느려지므로 마지막 수단
- 배치 사이즈는 **1** 유지 (배치 2 이상은 OOM)

### STEP 5 — 2인 컷 얼굴 인페인팅 (총 13컷)
```
1. STEP 4 결과에서 얼굴 영역 마스크
2. 해당 캐릭터의 face_ref 만 IP-Adapter 투입 (weight 0.85)
3. denoise 0.45~0.55 로 인페인팅
4. 경계 블렌딩 확인
```
- 대상: `p001-8, p002-7, p003-7, p004-6, p005-2, p005-7, p006-7, p009-8, p010-3, p010-4` 등
- **3인 컷(p010-4)은 얼굴 3개를 순차 인페인팅**

### STEP 6 — 업스케일 ×1.5
```
[Ultimate SD Upscale]
  upscale_model: 4x_foolhardy_Remacri
  scale: 1.5
  mode: Linear
  tile_width/height: 1024
  mask_blur: 8
  denoise: 0.30        ← 0.35 넘으면 질감이 재생성되어 붓자국이 사라짐
  steps: 20
  CFG: 5.5
```
- 832×1216 → **1248×1824**
- 업스케일 후 **원본과 나란히 비교**. 질감이 뭉개졌으면 denoise를 0.25로 낮춰 재실행

### STEP 7 — 페이지 합성
- `tools/compose_page.py` 사용 (절차적 손그림 테두리 생성)
- 레이아웃은 `tools/layouts/page_0XX.json` 에 정의
- 산출: `04_textless_pages/page_0XX.png` (1536×2304)

### STEP 8 — 말풍선 합성
- `tools/add_bubbles.py` 사용
- 대사는 `06_prompts/dialogue/page_0XX.json`
- 1차 자동 배치 → Krita/CSP에서 손그림 테두리·꼬리 수동 보정 (권장)
- 산출: `05_final_pages/page_0XX.png`

### STEP 9 — 최종 검수
- `07_checks/consistency_checklist.md` 전항목
- **1/4 축소해서 읽는 순서 확인**
- **3컷 대조 검수**: `p001-4` / `p005-5` / `p009-4`

---

## 4. 예상 소요 시간 (1화 10페이지 / 72컷)

| 단계 | 소요 | 비고 |
|---|---|---|
| STEP 0 환경 + 모델 선정 | 1일 | 1회성 |
| STEP 1 스타일 앵커 | 0.5일 | 1회성 |
| STEP 2 캐릭터 시트 | 1.5일 | 1회성 (전 에피소드 재사용) |
| STEP 3 컷 러프 | 1일 | |
| STEP 4 컷 최종 | 3~4일 | 72컷 × 평균 6장 생성 = 약 430장 |
| STEP 5 얼굴 인페인팅 | 0.5일 | 13컷 |
| STEP 6 업스케일 | 0.5일 | 야간 배치 권장 |
| STEP 7 페이지 합성 | 0.5일 | |
| STEP 8 말풍선 | 1일 | 수동 보정 포함 |
| STEP 9 검수 + 재생성 | 1일 | |
| **합계** | **약 10~11일** | 1회성 3일 제외하면 **2화부터 7~8일** |

### 생성 속도 기준 (4070 Ti)
- SDXL 832×1216, 32 steps: **약 12~16초/장**
- + ControlNet + IP-Adapter 2개: **약 22~30초/장**
- 업스케일 ×1.5 타일: **약 60~90초/장**
- → 72컷 × 6장 × 25초 ≈ **3시간** (생성 자체는 짧고, **선별·검수가 시간을 먹는다**)

---

## 5. 폴더 구조와 명명 규칙

```
project/
├── 00_docs/                    # 바이블·각본·규칙
├── 01_references/              # 시트·앵커·시드 (★ 동결 자산)
├── 02_pages/                   # (예비: 페이지 러프/중간물)
├── 03_panels/                  # 컷 개별 이미지
│   ├── page_001_panel_01.png
│   ├── page_001_panel_01_rough.png
│   └── page_001_panel_01_up.png     # 업스케일본
├── 04_textless_pages/          # 텍스트 없는 완성 페이지
├── 05_final_pages/             # 최종 (말풍선 포함)
├── 06_prompts/                 # 프롬프트 + 대사 JSON
│   └── dialogue/page_001.json
├── 07_checks/                  # 체크리스트·검수 기록
├── tools/                      # 후처리 스크립트
│   └── layouts/page_001.json   # 페이지 레이아웃 정의
├── assets/fonts/               # 한국어 폰트
└── comfyui/workflows/          # ComfyUI 워크플로우 JSON
```

### 명명 규칙
| 대상 | 형식 | 예 |
|---|---|---|
| 컷 러프 | `page_0XX_panel_0Y_rough.png` | `page_001_panel_04_rough.png` |
| 컷 최종 | `page_0XX_panel_0Y.png` | `page_001_panel_04.png` |
| 컷 업스케일 | `page_0XX_panel_0Y_up.png` | `page_001_panel_04_up.png` |
| 컷 버전 | `page_0XX_panel_0Y_v2.png` | 재생성 시 |
| 텍스트리스 페이지 | `page_0XX.png` | `04_textless_pages/page_001.png` |
| 최종 페이지 | `page_0XX.png` | `05_final_pages/page_001.png` |

---

## 6. 품질 저하 시 대응표

| 증상 | 원인 | 대응 |
|---|---|---|
| 그림이 번들거린다 | CFG 과다 / 체크포인트 성향 | CFG를 5.5로 낮춤, NEGATIVE에 `glossy, plastic` 확인 |
| 붓자국이 사라졌다 | 업스케일 denoise 과다 | denoise 0.25로 낮춤, 업스케일러 교체 |
| 선이 딱딱한 만화 선화다 | `clean lineart` 성향 모델 | NEGATIVE에 `clean lineart, crisp digital lineart` 추가, 체크포인트 재검토 |
| 캐릭터 얼굴이 달라진다 | IP-Adapter 가중치 부족 | 0.75 → 0.85, face_ref crop 품질 확인 |
| 안나가 말라진다 | 체형 드리프트 | `anna_body_01.png` 를 IP-Adapter 추가 투입, NEGATIVE에 `skinny, thin, slim` 강화 |
| 에스텔이 도적처럼 나온다 | `witch` 토큰의 기본 편향 | NEGATIVE 강화 + `serene herbalist, no hood, no dagger` 를 POSITIVE 앞쪽으로 이동 |
| 2인 컷에서 얼굴이 섞인다 | IP-Adapter 2개 충돌 | 1개만 걸고 나머지는 인페인팅 (STEP 5) |
| 키 차이가 안 맞는다 | 구도 제어 없음 | `height_chart.png` ControlNet depth 투입 |
| AI가 글자를 그린다 | NEGATIVE 누락 | `text, letters, korean text, typography` 확인 |
| 손가락이 이상하다 | SDXL 고질 | 손 인서트 컷은 `marie_hands.png` 레퍼런스 + 인페인팅 |
| OOM (메모리 부족) | 노드 과다 | ControlNet/IP-Adapter 합계 3개 이하, 배치 1 |

---

## 7. 2화 이후 재사용 자산

**다시 만들지 않는 것** (전 에피소드 공용):
- `01_references/` 전체 (시트·앵커·시드)
- `00_docs/style_bible.md`, `character_bible.md`
- `06_prompts/prompt_templates.md` (STYLE/NEGATIVE/CHARACTER/SETTING 블록)
- `tools/` 전체
- 체크포인트·VAE·파라미터 동결값

**에피소드마다 새로 만드는 것**:
- `episode0X_script.md`, `episode0X_shotlist.md`
- 페이지 레이아웃 JSON
- 대사 JSON
- 컷 이미지

→ **2화부터는 STEP 3~9만.** 약 7~8일.

### 신규 캐릭터가 등장할 때
1. `character_bible.md` 에 항목 추가
2. `character_sheet_prompts.md` 형식으로 시트 프롬프트 작성
3. 시트 생성 → 시드 동결 → `seeds.json` 추가
4. **기존 캐릭터 시트는 건드리지 않는다**
