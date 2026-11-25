# EP1 내레이션 음성

유튜브 영상용 내레이션. **음성 파일만** 만든다 (영상 조립은 별도).

| 항목 | 값 |
|---|---|
| 원고 | `narration/ep1_script.tsv` — 69줄 (`ID <탭> 문장`) |
| 발음 교정 | `narration/pronounce.tsv` — TTS 입력에만 적용 |
| TTS | edge-tts (Microsoft Edge 온라인 음성) |
| 목소리 | `ko-KR-InJoonNeural` — 남성, 차분한 다큐 내레이션 톤 |
| 속도 | `+5%` |
| 출력 | `audio/<ID>.mp3` (예: `audio/H01.mp3`) |

구성: H01~H09(9) / M01~M07(7) / A01~A10(10) / B01~B10(10) / C01~C16(16) / D01~D12(12) / E01~E05(5) = **69**

---

## 실행

```bash
pip install edge-tts
python tools/make_narration.py
```

69개가 `audio/` 에 생성된다. 네트워크 연결이 필요하다.

```bash
python tools/make_narration.py --check            # 생성 없이 점검 + 숫자 든 줄 목록
python tools/make_narration.py --only C14 E02     # 특정 줄만 다시
python tools/make_narration.py --force            # 전부 다시
```

실패한 줄이 있으면 마지막에 재실행 명령을 찍어준다. 0바이트·손상 파일은 자동으로 지우고 실패로 센다.

---

## 숫자 읽기 확인

`--check` 가 숫자·약어가 든 줄 21개를 뽑아준다. 그중 **몇 개를 실제로 들어보고**, 틀리게 읽으면
`narration/pronounce.tsv` 에 한 줄 추가한 뒤 그 줄만 다시 만든다.

```
C04	이천이십오년 일분기, 건설 사고사망자 칠십일 명 중 ...
```
```bash
python tools/make_narration.py --only C04
```

> **원고(`ep1_script.tsv`)는 절대 고치지 않는다.** 교정은 `pronounce.tsv` 에만 쓴다.
> 자막·타임코드가 원고 기준이라, 원고를 바꾸면 영상 쪽과 어긋난다.

### 미리 넣어둔 교정 2개
| ID | 문제 | 교정 |
|---|---|---|
| C14 | `119` → "백십구" 로 읽힘 | **일일구** |
| E02 | `CSO` → 영문 약어 | **씨에스오** |

### 들어볼 것 (교정 안 함 — 대개 맞게 읽지만 확인 권장)
- **C04** `2025년 1분기`, `71명`, `39명` — 한 줄에 숫자가 가장 많다. 여기부터 들어볼 것
- **M06** `120억`, `150억` / **D02** `50억에서 120억 ... 100억`
- **A07** `7시`, `4시 반`, `6일` — 시각은 "일곱 시"(고유어)가 맞다. "칠 시"로 읽으면 교정
- **D06** `6천만에서 7천만`
- **B07** `450만`, `밤 8시`

---

## 목소리를 바꾸려면

`tools/make_narration.py` 상단의 `VOICE` / `RATE` 를 고치고 `--force` 로 전부 다시 만든다.
**69줄이 전부 같은 목소리여야 하므로 중간에 바꾸지 말 것.**

한국어 다른 선택지:
```bash
edge-tts --list-voices | findstr ko-KR      # Windows
edge-tts --list-voices | grep ko-KR         # macOS / Linux
```
`ko-KR-HyunsuMultilingualNeural`(남) / `ko-KR-SunHiNeural`(여) 등이 있다.
