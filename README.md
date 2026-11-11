# 《숲의 약방》 / The Forest Apothecary

판타지 GL 만화/애니메이션 제작 저장소.
**손그림 느낌 · 유화/수채/잉크 혼합 질감 · 회화적 판타지**를 고정 스타일로 하고,
로컬 AI(ComfyUI) 로 컷을 생성한 뒤 **말풍선은 전부 후처리**로 얹는다.

---

## 지금 바로 할 일 — 실행 체크리스트

### PHASE 0 — 읽기 (1시간)
- [ ] `00_docs/style_bible.md` — 그림체 / 색감 / 질감 / 금지사항
- [ ] `00_docs/character_bible.md` — 캐릭터 6인 고정 사양
- [ ] `00_docs/speech_bubble_rules.md` — 말풍선 규칙
- [ ] `00_docs/local_pipeline.md` — 9단계 파이프라인

### PHASE 1 — 환경 구축 (1일)
- [ ] ComfyUI + ComfyUI-Manager 설치
- [ ] 커스텀 노드: IPAdapter_plus / controlnet_aux / UltimateSDUpscale
- [ ] 모델 다운로드 (`local_pipeline.md` §1-2 목록)
- [ ] **회화풍 SDXL 체크포인트 후보 3~4개**로 `anchor_01`·`anchor_04` 비교 생성
- [ ] 1개 선정 → `01_references/seeds.json` 의 `engine` 에 기록하고 `locked: true`

### PHASE 2 — 스타일 고정 (0.5일) ★ 건너뛰면 전체가 흔들린다
- [ ] `06_prompts/character_sheet_prompts.md` STEP 1 의 앵커 6종 생성
- [ ] 각 6~8장 → 1장 선정 → `01_references/style_anchor_0X.png`
- [ ] 검수: 붓자국 / 종이 질감 / 광택 없음

### PHASE 3 — 캐릭터 고정 (1.5일) ★ 전 에피소드 재사용
- [ ] 마리 시트 (3뷰 + 표정 6 + 손 + 의상)
- [ ] **안나 시트 (3뷰 + 체형 시트 + 표정 6 + 포즈 6)** ← 체형 드리프트 1순위
- [ ] **에스텔 시트 (3뷰 + 모자 + 포즈 6 + 표정 6)** ← 도적처럼 나오는지 확인
- [ ] 베르타 / 엘제 / 소년 시트
- [ ] `height_chart.png` (키 비교) + `props_sheet.png`
- [ ] 각 시트의 **얼굴만 crop** → `*_face_ref.png`
- [ ] 시드 기록 → `seeds.json` 전부 `locked: true`

### PHASE 4 — 컷 러프 (1일)
- [ ] 73컷 러프 생성 (512×768, steps 14)
- [ ] 레이아웃 종횡비 확인: `python tools/compose_page.py tools/layouts/page_001.json --allow-missing`

### PHASE 5 — 컷 최종 (3~4일)
- [ ] `06_prompts/page_prompts_01-05.md` / `06-10.md` 의 ACTION 으로 컷 생성
- [ ] 컷마다 `07_checks/consistency_checklist.md` **A 체크** (10초)
- [ ] 2인+ 컷 13개 → 얼굴 개별 인페인팅
- [ ] 업스케일 ×1.5 (denoise 0.30 이하)
- [ ] `03_panels/page_0XX_panel_0Y.png` 로 저장

### PHASE 6 — 페이지 합성 (0.5일)
- [ ] `python tools/compose_page.py tools/layouts/page_0XX.json`
- [ ] `07_checks/consistency_checklist.md` **B 체크** (레이아웃)

### PHASE 7 — 말풍선 (1일)
- [ ] `python tools/add_bubbles.py 06_prompts/dialogue/page_0XX.json --check` → 오류 0
- [ ] `python tools/add_bubbles.py 06_prompts/dialogue/page_0XX.json`
- [ ] 눈으로 보고 `box` / `tail_to` 미세 조정 → 재실행
- [ ] (선택) Krita/CSP 에서 테두리·꼬리 수동 보정
- [ ] **C 체크** (오타 / 꼬리 / 말투)

### PHASE 8 — 최종 검수 (1일)
- [ ] **D 체크** — 페이지 간 스타일 드리프트 (인접 페이지 나란히 비교)
- [ ] **E 체크** — `p001-4` / `p005-5` / `p009-4` **세 컷 대조** ★★
- [ ] **F 체크** — AI 티 제거
- [ ] 페이지별 `07_checks/log_page_0XX.md` 기록

---

## 문서 지도

| 파일 | 내용 |
|---|---|
| `00_docs/style_bible.md` | 그림체·색감·질감·금지사항·해상도 |
| `00_docs/character_bible.md` | 캐릭터 6인 고정 사양 + 말투 + 포즈 레퍼토리 |
| `00_docs/episode01_script.md` | 1화 각본 (10씬 / 10분) + 복선 목록 |
| `00_docs/episode01_shotlist.md` | 73컷 샷 리스트 (크기·샷·대사) |
| `00_docs/page_layout_rules.md` | 컷 분할 규칙 + 10페이지 레이아웃 설계안 |
| `00_docs/speech_bubble_rules.md` | 말풍선 규격·타이포·꼬리·검수 |
| `00_docs/local_pipeline.md` | ComfyUI 9단계 + 파라미터 + 문제 대응표 |
| `06_prompts/prompt_templates.md` | STYLE/NEGATIVE/CHARACTER/SETTING 블록 (**수정 금지**) |
| `06_prompts/character_sheet_prompts.md` | 시트 생성 프롬프트 + 합격 기준 |
| `06_prompts/page_prompts_01-05.md` | p001~p005 컷별 영문 프롬프트 + 한국어 대사 분리본 |
| `06_prompts/page_prompts_06-10.md` | p006~p010 동일 |
| `07_checks/consistency_checklist.md` | A~F 검수 체크리스트 |

---

## 도구

```bash
# 10페이지 레이아웃 + 말풍선 JSON 생성/갱신
python tools/scaffold.py

# 컷 → 페이지 합성 (손그림 테두리 절차 생성)
python tools/compose_page.py tools/layouts/page_001.json
python tools/compose_page.py tools/layouts/page_001.json --allow-missing   # 컷 없이 레이아웃만 확인

# 말풍선 검수 (합성 없이)
python tools/add_bubbles.py 06_prompts/dialogue/page_001.json --check

# 말풍선 합성
python tools/add_bubbles.py 06_prompts/dialogue/page_001.json
```

### `--check` 가 잡아주는 것
- 폰트 28px 미만 / 4줄 이상 / 한 줄 14자 초과
- `tail_to` 누락 (= 화자 불분명)
- 캡션에 꼬리가 달림
- `...` 대신 `…` 미사용
- **에스텔 대사의 존댓말**
- 말풍선 간 간격 16px 미만 (겹침)

### 좌표를 고치는 법
- 컷 배치: `tools/layouts/page_0XX.json` 의 `box: [x, y, w, h]`
- 말풍선: `06_prompts/dialogue/page_0XX.json` 의 `box`(텍스트 블록) / `tail_to`(화자 좌표)
- `tools/scaffold.py` 를 다시 돌리면 **p001 을 뺀 나머지는 덮어쓰인다.** 손으로 고친 페이지는
  `scaffold.py` 의 예외 목록에 추가하거나, 고친 뒤 `scaffold.py` 를 돌리지 않는다.

> 말풍선 좌표는 **자동 배치 초안**이다. 한 패널에 대사가 3개 이상이면 읽는 순서가
> 어색해질 수 있으니, 렌더한 페이지를 보고 손으로 다듬는 것을 전제로 한다.

---

## 절대 규칙 (요약)

1. **텍스트는 AI가 그리지 않는다.** 그림은 textless, 글자는 후처리.
2. **캐릭터 시트와 시드는 동결한다.** 확정 후 재생성 금지.
3. **에스텔은 반말.** 존댓말 1개라도 발견되면 전체 재검수.
4. **안나는 육덕지고 따뜻한 체형.** 마르면 재생성. 노골적이면 재생성.
5. **에스텔은 약초 마녀**지 도적이 아니다. 후드·단검·팔짱 금지.
6. **하이라이트 컷은 크게, 연결 컷은 작게.** 중요한 장면을 작은 컷으로 끝내지 않는다.
7. **바스트샷 2연속 금지.** 샷은 페이지당 4종 이상 섞는다.
8. **말풍선 꼬리는 화자를 명확히 가리킨다.**
9. **설명충 대사 금지.** 보여주는 연출로 처리한다.
10. **붓자국과 종이 질감이 사라지면 실패다.**

---

## 폰트

`assets/fonts/` 에 나눔고딕(OFL, 상업 이용 가능)이 포함되어 있다.
Pretendard 를 쓰려면 같은 폴더에 `Pretendard-Regular.otf` / `Pretendard-Bold.otf` 를 넣으면 자동으로 잡힌다.
Windows 에서는 `C:/Windows/Fonts/malgun.ttf` 도 자동 인식한다.
