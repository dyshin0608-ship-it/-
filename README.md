# medi

복약 알림 앱 (Expo + React Native + TypeScript).

화면은 1개이며, 가운데에 **복약 알림** 이라고 크게 표시됩니다.

## 구성

| 파일 | 설명 |
| --- | --- |
| `app/_layout.tsx` | expo-router 루트 레이아웃 (헤더 없는 Stack) |
| `app/index.tsx` | 유일한 화면 — 가운데 "복약 알림" 텍스트 |
| `app.json` | 앱 이름/슬러그, 안드로이드 패키지명(`com.medi.app`), 아이콘, expo-router 플러그인 |
| `eas.json` | EAS Build 프로필 (`preview` = 설치용 APK, `production` = 스토어용 AAB) |
| `assets/` | 앱 아이콘 |

- Expo SDK 58 / React Native 0.88 / TypeScript
- 라우팅: `expo-router` (`package.json`의 `main`이 `expo-router/entry`)

## 컴퓨터에서 개발할 때

```bash
npm install
npm start          # Expo Dev Server 실행 후 Expo Go 또는 개발 빌드로 접속
npx tsc --noEmit   # 타입 체크
```

---

# 📱 핸드폰만으로 안드로이드 APK 빌드해서 설치하기 (EAS 무료 플랜)

컴퓨터 없이, 폰의 **브라우저(Chrome 등)** 와 **GitHub 앱/웹**만으로 진행하는 순서입니다.
핵심 아이디어: 빌드는 Expo의 클라우드 서버(EAS)가 하고, 폰은 "버튼 누르고 결과 APK 내려받는" 역할만 합니다.

## 0단계 — 준비물

- 안드로이드 폰 1대
- 이 저장소가 올라가 있는 GitHub 계정 (이미 있음)
- Expo 계정 (아래 1단계에서 무료로 만듭니다)

> 무료 플랜도 안드로이드 클라우드 빌드가 됩니다. 다만 **월 빌드 횟수 제한**이 있고 **대기열 우선순위가 낮아서** 빌드 시작까지 수십 분 기다릴 수 있습니다. 최신 조건은 https://expo.dev/pricing 에서 확인하세요.

## 1단계 — Expo 계정 만들기

1. 폰 브라우저에서 https://expo.dev 접속
2. **Sign Up** → 이메일/비밀번호(또는 GitHub 계정)로 가입
3. 가입할 때 정한 **username(계정 이름)** 을 기억해 두세요. 2단계에서 씁니다.

## 2단계 — expo.dev에서 프로젝트 만들기

1. 로그인 후 좌측(또는 상단) **Projects** → **Create a project**
2. 프로젝트 이름(slug)은 `medi` 로 입력하고 생성
3. 생성된 프로젝트 화면에 **Project ID** (예: `a1b2c3d4-5678-90ab-cdef-1234567890ab`) 가 보입니다. 이 값을 복사하세요.

## 3단계 — app.json에 내 계정 정보 넣기 (폰에서 GitHub 웹 편집)

EAS가 "이 소스코드가 내 Expo 프로젝트"라는 걸 알아야 하므로, `app.json`에 두 줄을 추가합니다.

1. 폰 브라우저에서 이 저장소의 `app.json` 파일을 엽니다
2. 연필(✏️) 아이콘 → **Edit this file**
3. `"expo": {` 바로 아래에 `owner`를, 그리고 `"experiments"` 앞쪽에 `extra`를 넣습니다. 최종 모습:

```json
{
  "expo": {
    "owner": "여기에-내-expo-username",
    "name": "medi",
    "slug": "medi",
    "...": "기존 내용 그대로",
    "extra": {
      "eas": {
        "projectId": "여기에-2단계에서-복사한-Project-ID"
      }
    }
  }
}
```

4. 아래 **Commit changes** 로 저장 (브랜치는 이 저장소의 기본 브랜치 그대로)

> `owner`는 Expo username, `projectId`는 2단계의 Project ID입니다. 둘 다 따옴표 안에 넣어야 합니다.

## 4단계 — expo.dev에 GitHub 저장소 연결하기

1. 폰 브라우저에서 expo.dev → 내 `medi` 프로젝트 → **GitHub** 탭
2. **Connect GitHub account** → GitHub 로그인 → Expo GitHub App 설치 허용
   - 범위를 물어보면 이 저장소만 선택해도 됩니다
3. 돌아와서 **Link repository** → 이 저장소 선택 → 연결 완료
4. Base directory는 비워 두세요 (`app.json`, `eas.json`이 저장소 최상단에 있습니다)

## 5단계 — 폰에서 빌드 시작하기

1. expo.dev → 내 `medi` 프로젝트 → **Builds** → **Build from GitHub** (또는 GitHub 탭의 **Build now**)
2. 옵션을 이렇게 고릅니다:
   - **Platform**: `Android`
   - **Build profile**: **`preview`** ← ⭐ 꼭 preview! (`eas.json`에서 `buildType: apk`로 설정되어 있어 폰에 바로 설치 가능한 **APK**가 나옵니다)
   - **Git ref / branch**: 기본 브랜치
3. **Build** 눌러서 시작
4. 서명 키(keystore)를 묻는다면 **EAS가 자동 생성/관리**하도록 두면 됩니다 (Generate new keystore). 직접 만들 필요 없습니다.

> ⚠️ `production` 프로필로 빌드하면 **AAB** 파일이 나오는데, 이건 구글 플레이 업로드용이라서 폰에 바로 설치할 수 없습니다. 폰에 설치하려면 반드시 **`preview`** 프로필을 쓰세요.

## 6단계 — 빌드 기다리기

- Builds 목록에서 상태가 `In queue` → `In progress` → `Finished` 로 바뀝니다
- 무료 플랜은 대기열 때문에 **보통 10~40분**, 더 걸릴 수도 있습니다. 폰 화면을 켜두지 않아도 됩니다
- 실패하면 해당 빌드를 눌러 **Logs**를 보면 어디서 멈췄는지 한 화면에서 확인할 수 있습니다

## 7단계 — APK 내려받아 설치하기

1. `Finished` 된 빌드를 탭해서 상세 화면으로 들어갑니다
2. **Install** 버튼 (또는 **Download**) 을 누릅니다 → `.apk` 파일이 다운로드됩니다
3. 다운로드 알림을 탭해서 APK를 엽니다
4. "이 출처의 앱 설치를 허용하시겠습니까?" 가 나오면
   - **설정** 으로 이동 → **이 출처 허용(Allow from this source)** 켜기 → 뒤로 → 다시 **설치**
   - (기종에 따라 "알 수 없는 앱 설치", "출처를 알 수 없는 앱" 등으로 표시됩니다)
5. Play Protect가 경고하면 **무시하고 설치(Install anyway)** 를 선택합니다. 서명이 내 개인 키라서 나오는 정상적인 경고입니다
6. 홈 화면에 **medi** 앱이 생깁니다. 실행하면 가운데에 **복약 알림** 이 크게 보입니다 ✅

## 8단계 — 코드를 고친 뒤 다시 빌드하기

1. 폰에서 GitHub 웹으로 파일 수정 → Commit
2. expo.dev → Builds → **Build from GitHub** → `Android` + `preview` 로 다시 빌드
3. 새 APK를 내려받아 설치하면 기존 앱 위에 덮어쓰기 업데이트됩니다 (패키지명과 서명이 같으므로 가능)

---

## 자주 막히는 부분

| 증상 | 원인 / 해결 |
| --- | --- |
| 빌드 시작 시 "project not found" | 3단계의 `owner` / `extra.eas.projectId` 값이 비었거나 오타입니다. app.json을 다시 확인하세요 |
| APK 대신 AAB가 나왔다 | 빌드 프로필을 `production`으로 골랐습니다. `preview`로 다시 빌드하세요 |
| 설치 버튼을 눌렀는데 "앱을 설치할 수 없음" | 같은 패키지명(`com.medi.app`)의 앱이 **다른 서명**으로 이미 깔려 있습니다. 기존 앱을 삭제하고 다시 설치하세요 |
| 빌드가 월 한도 초과로 막힌다 | 무료 플랜 한도입니다. 다음 달을 기다리거나 유료 플랜으로 올리세요 (https://expo.dev/pricing) |
| Expo Go로 먼저 확인하고 싶다 | 이 앱은 추가 네이티브 모듈이 없어서 Expo Go로도 미리보기가 가능합니다. 단, Dev Server를 돌릴 컴퓨터가 필요하므로 폰만 있을 때는 위의 APK 빌드가 더 확실합니다 |

## 참고: 터미널을 쓸 수 있다면

컴퓨터(또는 폰의 클라우드 터미널)에서 직접 빌드할 수도 있습니다. 결과는 위와 동일한 APK입니다.

```bash
npm install -g eas-cli
eas login
eas init            # app.json에 owner / projectId를 자동으로 채워 줍니다
eas build -p android --profile preview
```

빌드가 끝나면 터미널에 나오는 링크 또는 QR 코드로 폰에서 APK를 받아 설치합니다.
