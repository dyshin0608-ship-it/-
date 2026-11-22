# CLAUDE.md — 《숲의 약방》 작업 지침

판타지 GL 만화/애니메이션 제작 저장소. 로컬 ComfyUI 로 컷을 생성하고 말풍선은 후처리로 얹는다.

---

## 절대 규칙 (어기면 결과물 폐기)

1. **텍스트는 AI가 그리지 않는다.** 그림은 textless 로 생성, 한국어는 `tools/add_bubbles.py` 로 합성.
2. **캐릭터 시트와 시드는 확정 후 동결한다.** `01_references/seeds.json` 의 `locked: true` 는 재생성 금지 표시.
3. **에스텔은 반말 고정.** 존댓말이 1개라도 나오면 전체 재검수.
4. **안나는 육덕지고 따뜻한 체형.** 마르면 재생성, 노골적이면 재생성. 둘 다 실패다.
5. **에스텔은 약초 마녀**지 도적이 아니다. 후드·단검·가죽벨트 다중·팔짱 금지.
6. **마리는 조용하고 청초한 흑발 주인공.** 표정 폭이 작다. 입을 크게 벌리지 않는다.
7. **하이라이트 컷은 크게, 연결 컷은 작게.** 중요한 장면을 작은 컷으로 끝내지 않는다.
8. **바스트샷 2연속 금지.** 샷은 페이지당 4종 이상 섞는다.
9. **말풍선 꼬리는 화자를 명확히 가리킨다.**
10. **붓자국과 종이 질감이 사라지면 실패다.** 번들거리는 플라스틱 광택·3D 렌더 금지.

> 결과물이 `00_docs/style_bible.md` / `character_bible.md` 와 충돌하면 **예쁘더라도 폐기하고 재생성한다.**
> "이번만 넘어가자"가 스타일 붕괴의 시작이다.

---

## 작업 전에 읽을 것

| 상황 | 파일 |
|---|---|
| 그림체·색감·질감을 정할 때 | `00_docs/style_bible.md` |
| 캐릭터를 그릴 때 | `00_docs/character_bible.md` |
| 컷 내용을 확인할 때 | `00_docs/episode01_shotlist.md` (73컷) |
| 대사를 확인할 때 | `00_docs/episode01_script.md` |
| 컷 분할을 할 때 | `00_docs/page_layout_rules.md` |
| 말풍선을 얹을 때 | `00_docs/speech_bubble_rules.md` |
| ComfyUI 설정·파라미터·문제 해결 | `00_docs/local_pipeline.md` |
| 프롬프트를 쓸 때 | `06_prompts/prompt_templates.md` ← **STYLE/NEGATIVE 블록 수정 금지** |
| 캐릭터 시트를 뽑을 때 | `06_prompts/character_sheet_prompts.md` |
| 컷을 생성할 때 | `06_prompts/page_prompts_01-05.md`, `_06-10.md` |
| 검수할 때 | `07_checks/consistency_checklist.md` |

실행 순서 전체는 `README.md` 의 PHASE 0~8 체크리스트.

---

## 도구

```bash
python tools/scaffold.py                                        # 레이아웃·말풍선 JSON 생성
python tools/compose_page.py tools/layouts/page_001.json        # 컷 → 페이지 합성
python tools/compose_page.py tools/layouts/page_001.json --allow-missing   # 컷 없이 레이아웃만 확인
python tools/add_bubbles.py 06_prompts/dialogue/page_001.json --check      # 말풍선 규칙 검수
python tools/add_bubbles.py 06_prompts/dialogue/page_001.json              # 말풍선 합성
```

- 의존성은 Pillow 하나. 한국어 폰트는 `assets/fonts/` 에 나눔고딕 포함(OFL).
- `scaffold.py` 는 **page_001 을 제외한 나머지를 덮어쓴다.** 손으로 다듬은 페이지가 생기면 그 페이지도
  예외 목록에 추가하거나, 이후 `scaffold.py` 를 돌리지 않는다.
- 말풍선 좌표는 자동 배치 **초안**이다. 렌더해 보고 `box` / `tail_to` 를 손으로 다듬는 것을 전제로 한다.
  한 패널에 대사가 3개 이상이면 읽는 순서가 어색해지기 쉽다 (예: p002 panel 5).

---

## 하드웨어와 모델 결정

**환경**: Intel i7 13세대 / **RTX 4070 Ti 12GB** / 1000W / Windows

**두 갈래로 나눈다. 섞지 않는다.**

| 용도 | 모델 | 이유 |
|---|---|---|
| **정지 컷 73장** | **SDXL 계열 회화풍 체크포인트** | IP-Adapter / ControlNet 생태계가 SDXL 에만 성숙하다. 73컷을 같은 얼굴로 뽑으려면 이게 필수 |
| **애니메이션 (1화 10분)** | **WAN 2.2 TI2V-5B** (이미 설치됨) | 완성된 컷을 i2v 시작 이미지로 넣어 움직인다. 컷 확정 **이후** 단계 |

- 12GB 라 둘을 동시에 올릴 수 없다. **SDXL 로 컷 확정 → WAN 으로 애니메이트** 순서.
- SDXL + ControlNet 1 + IP-Adapter 2 = 약 10~11GB 로 한계선. **3개 이상 동시 투입 금지.** 배치는 1.
- 1536×2304 직접 생성 불가 → 컷 단위 생성 후 타일 업스케일(denoise 0.30 이하).

---

## 현재 상태 (2026-11)

**완료**
- 문서 7종, 프롬프트 3종, 검수 체크리스트
- 1화 각본 10씬 / 샷리스트 73컷 / 10페이지 레이아웃
- 후처리 도구 3종 — 10페이지 전부 검수 오류 0건으로 동작 확인
- 말풍선 JSON 10페이지분 (page_001 은 수동 확정, 나머지는 자동 배치 초안)

**미완**
- **이미지가 한 장도 없다.** 캐릭터 시트, 스타일 앵커, 73컷 전부 미생성
- `01_references/seeds.json` 전부 `null` / `locked: false`
- ComfyUI 에 SDXL 체크포인트 미선정

**다음에 할 일 — README PHASE 1**
1. ComfyUI 커스텀 노드 설치: IPAdapter_plus, controlnet_aux, UltimateSDUpscale
2. 회화풍 SDXL 체크포인트 **후보 3~4개**로 `character_sheet_prompts.md` 의 `anchor_01`(정물)·`anchor_04`(꽃 매크로) 를 동일 시드로 비교 생성
3. 1개 선정 → `seeds.json` 의 `engine` 에 기록하고 `locked: true`
4. PHASE 2 (스타일 앵커 6장) → PHASE 3 (캐릭터 시트)

> **PHASE 2~3 을 건너뛰고 컷부터 뽑지 말 것.** 시트가 없으면 73컷이 전부 다른 사람이 된다.

---

## ComfyUI 프롬프트 작성 시 주의

기존 WAN 워크플로우에서 발견된 문제들 — SDXL 로 옮길 때 반복하지 말 것:

- **설정 충돌**: `38 years old`, `korean woman` 같은 태그는 캐릭터 바이블(안나 24세)과
  중세 유럽 수도원 배경에 맞지 않는다. `character_bible.md` 의 CHARACTER_BLOCK 을 그대로 쓴다.
- **가중치 과다**: `(extremely voluptuous:1.35)`, `(very thick thighs:1.4)` 처럼 1.3~1.4 를 여러 개
  쌓으면 서로 싸워 해부학이 무너진다. **1.1~1.2 로 낮추고 개수를 줄인다.**
- **체형은 프롬프트보다 레퍼런스로**: 안나의 체형은 가중치가 아니라 `anna_body_01.png` 를
  IP-Adapter 가중치 0.80 으로 물려서 고정한다.
- **화풍 네거티브 누락 주의**: `glossy, plastic skin, 3d render, cgi, anime screencap,
  clean lineart, photorealistic, romance fantasy novel cover` 를 반드시 포함.
- **i2v 비율**: 시작 이미지와 latent 의 종횡비가 다르면 늘어나거나 잘린다. 세로 컷이면 704×1280.

---

## 커밋

- 개발 브랜치: `ccr-04cdc64e-k84hik`
- 생성 이미지(`02_pages`~`05_final_pages`)는 `.gitignore` 로 제외된다. 용량이 크고 재생성 가능하기 때문.
- **단, `01_references/` 의 확정 시트는 커밋한다.** 전 에피소드의 기준 자산이라 유실되면 안 된다.
