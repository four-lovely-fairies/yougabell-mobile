# yougabell-mobile

> Expo RN 셸. 네이티브 기능 + WebView 컨테이너.
> 워크스페이스 전체 컨벤션은 umbrella 레포 [`yougabell`](https://github.com/four-lovely-fairies/yougabell/blob/main/AGENTS.md) 참조.
> 디자인 시스템·토큰은 [`DESIGN.md`](./DESIGN.md) 참조 (Figma MCP 연결 후 채워짐).

## 빌드 · 실행 · 검증 명령

```bash
pnpm install
pnpm start              # expo start (Metro bundler)
pnpm android            # expo start --android (에뮬레이터)
pnpm ios                # expo start --ios (시뮬레이터)
pnpm web                # expo start --web (참고용, 메인 타깃 아님)
pnpm lint               # eslint .
pnpm test               # jest
pnpm reset-project      # scripts/reset-project.js (스캐폴더 보일러플레이트 초기화)
```

> EAS 빌드: `pnpm exec eas build --platform ios|android` (별도 EAS 셋업 필요). 전역 `eas` 설치를 전제하지 않으며, 레포에 고정된 `eas-cli` 버전을 사용한다.

## 스택

- Expo SDK 54 (`expo-router` 6, `react-navigation` 7, `reanimated` 4)
- React Native 0.81
- TypeScript strict
- pnpm, Node 24 LTS
- EAS Build → 스토어 배포

## 핵심 원칙

- **얇은 셸**: UI는 가능한 한 `yougabell-web`이 담당. RN은 네이티브 영역만.
- **DB 직접 접근 금지**: 모든 도메인 호출은 `yougabell-api`로.
- **인증**: Supabase Auth SDK. 토큰은 SecureStore에 저장하고 WebView로 안전하게 전달.
- **네이티브 기능 범위**:
  - 푸시 알림 (Expo Notifications)
  - 생체 인증 / SecureStore
  - 카메라 · 사진 (성장 기록 첨부)
  - 딥링크
- **WebView ↔ Native 통신**: `postMessage` 프로토콜은 `webview/webview-bridge.ts`를 단일 진실로 사용.
- **Google 로그인**: WebView 안에서 직접 시작하지 않는다. Android는 `@react-native-google-signin/google-signin`으로 ID Token을 받은 뒤 Supabase `signInWithIdToken`을 호출하고, iOS는 외부 보안 브라우저 OAuth를 수행한다. 완료된 Supabase 세션을 WebView에 동기화한다.
- **Apple OAuth**: iOS는 `expo-apple-authentication` 기반 native 로그인, Android는 외부 보안 브라우저 OAuth를 사용한다.
- **브라우저 OAuth 콜백은 `auth/open-oauth-session.ts`의 `openOAuthSession`으로만 연다** (Google iOS·Apple Android). 직접 `WebBrowser.openAuthSessionAsync`만 쓰지 않는다.
  - **Android 딥링크 함정**: `app.json`의 `scheme: "yougabell"` + `app/auth/callback.tsx` 라우트 때문에 Android에 `yougabell://auth/callback` 딥링크 intent-filter가 자동 등록된다. Supabase가 이 커스텀 스킴으로 302 리다이렉트하면 Android 딥링크가 URL을 먼저 가로채 앱을 foreground로 띄우고 Chrome Custom Tab은 dismiss된다. 그 결과 `openAuthSessionAsync`는 `{ type: "dismiss" }`만 반환하고 인증 `code`는 WebBrowser 결과가 아니라 `Linking` 딥링크로 도착한다 → 처리 누락 시 **Android만 가입/로그인 실패**(증상: `type=dismiss url=none`).
  - **해결**: `openOAuthSession`이 WebBrowser `success`와 `Linking` 딥링크 두 경로를 함께 기다려 먼저 도착하는 콜백 URL을 쓴다. iOS의 `ASWebAuthenticationSession`은 스킴을 내부에서 가로채 `success`를 반환하므로 이 우회가 필요 없다.
- **컴포넌트 파일명**: kebab-case (`webview-bridge.tsx`).

## 디렉토리 (src 없는 형식, expo-router 기준)

```
.
├── app/                 # expo-router 라우트
│   ├── (tabs)/
│   ├── _layout.tsx
│   └── modal.tsx
├── components/
├── constants/           # 색상·테마 등
├── hooks/
├── assets/
├── webview/             # WebView 컨테이너 + 통신 브릿지 (TBD)
├── auth/                # Supabase Auth SDK 통합 (TBD)
├── notifications/       # 푸시 (TBD)
└── scripts/             # reset-project.js 등 운영 스크립트
```

## 환경 변수

`EXPO_PUBLIC_*`은 **빌드 타임에 번들에 노출**됨 (시크릿 X). EAS Secrets로 환경별 분리. `.env.example` 참조.

- `EXPO_PUBLIC_WEB_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Google Cloud의 Web application OAuth Client ID, Android 네이티브 Google 로그인용)

Supabase redirect allow-list에는 반드시 `yougabell://auth/callback`를 추가한다.

## 테스트 규칙

- RN 테스트는 **`@testing-library/react-native`만 사용**한다.
- **`@testing-library/jest-native`는 사용하지 않는다.** deprecated 상태이므로 다시 추가하지 않는다.
- matcher는 `@testing-library/react-native`의 내장 matcher를 기준으로 쓴다.

## 배포

기본 흐름: **EAS Build → 스토어 제출(submit) → 사용자 스토어 업데이트**. JS-only 수정은 **EAS Update(OTA)**로 스토어 심사 없이 즉시 배포 가능.

### 새 바이너리가 필요한 작업의 버전 범프 시점

버전 확인·범프는 EAS Build 직전까지 미루지 않는다. 아래 변경을 포함한 작업은 새 스토어 바이너리가 필요하므로, **기능 PR을 머지하기 전에** 현재 `app.json` version과 기존 EAS production 빌드를 비교한다.

- `ios/`, `android/`, `modules/`, config plugin(`plugins/`) 변경
- 네이티브 모듈 또는 Expo SDK 추가·변경
- `app.json`의 plugins·권한·아이콘·스플래시·네이티브 설정 변경

현재 version이 이미 EAS 빌드에 사용되었다면 patch version을 올리고 `chore(mobile): 앱 버전 <이전> → <이후>` 별도 커밋을 **같은 기능 PR에 포함**한다. JS/TS-only이며 기존 바이너리에 OTA 가능한 변경은 이 규칙으로 version을 올리지 않는다. EAS Build 직전 확인은 누락을 잡는 마지막 안전장치다.

예외: 같은 스토어 릴리스의 빌드가 컴파일·서명·제출 전에 실패하여 재시도하는 경우에는 표시 version을 다시 올리지 않는다. 성공한 다른 플랫폼과 같은 version을 유지하고 EAS remote autoIncrement로 실패한 플랫폼의 buildNumber/versionCode만 증가시킨다.

### 새 네이티브 빌드 빠른 실행 순서

네이티브 코드·Expo config plugin·`app.json` 네이티브 설정이 바뀐 경우(예: 앱 시작 계측)는 **OTA가 아니라 새 스토어 빌드**가 필요하다. 관련 웹 배포가 있다면 웹 PR을 먼저 main에 머지해 프로덕션 배포가 끝난 것을 확인하고, 버전 범프 커밋이 포함된 모바일 PR을 main에 머지한 checkout에서 아래를 실행한다.

```bash
# 1. 이미 사용한 표시 버전인지 확인한다.
node -p "require('./app.json').expo.version"
pnpm exec eas build:list --limit 5 --non-interactive

# 2. 이미 사용한 version이면 빌드를 중단한다. PR 전 버전 게이트가 누락된 상태다.
# 3. Android와 iOS production 빌드를 각각 큐에 넣는다.
pnpm exec eas build --platform android --profile production --non-interactive --no-wait
pnpm exec eas build --platform ios --profile production --non-interactive --no-wait

# 4. 완료된 Android/iOS buildId를 확인한다.
pnpm exec eas build:list --limit 4 --non-interactive

# 5. Android는 먼저 Google Play internal track에 제출한다.
pnpm exec eas submit --platform android --profile internal --id <androidBuildId> --non-interactive

# 6. iOS는 App Store Connect에 제출하여 TestFlight에서 검증한다.
pnpm exec eas submit --platform ios --profile production --id <iosBuildId> --non-interactive

# 7. Android 내부 QA 후 같은 buildId를 production track에 제출한다.
pnpm exec eas submit --platform android --profile production --id <androidBuildId> --non-interactive
```

`eas.json`에서 `submit.internal.android.track`은 `internal`, `submit.production.android.track`은 `production`이다. Android `production` submit은 실사용자 공개 트랙으로 전송하므로 내부 QA 전에는 실행하지 않는다. iOS `production` submit은 App Store Connect에 빌드를 업로드하며 곧바로 App Store에 공개하지 않는다. TestFlight 검증 후 App Store Connect에서 해당 빌드를 앱 버전에 연결해 심사 제출·출시한다.

### 버전 체계

이름이 비슷한 두 값이 **서로 다르게 관리된다.** 혼동이 실제 배포 사고로 이어졌으므로 먼저 구분한다.

| 값                                    | 예시      | 관리 주체        | 자동 증가                    |
| ------------------------------------- | --------- | ---------------- | ---------------------------- |
| `app.json`의 `version` (표시 버전)    | `1.1.2`   | git (`app.json`) | **없음 — 사람이 올린다**     |
| iOS buildNumber · Android versionCode | `16`/`17` | EAS 서버(remote) | 있음 (`autoIncrement: true`) |

- **`version`을 자동으로 올려주는 장치는 어디에도 없다.** EAS도, CI도, 에이전트 설정(`.claude/settings.json`, 훅)도 하지 않는다. `eas.json`의 `autoIncrement: true`는 이름과 달리 **buildNumber/versionCode만** 증가시키며 `version`은 건드리지 않는다.
- **versionCode/buildNumber는 `appVersionSource: "remote"`로 EAS 서버가 중앙 관리한다.** `app.json`에는 `android.versionCode`를 두지 않는다(있어도 remote 소스에선 무시됨). `autoIncrement: true`가 빌드마다 remote 카운터를 증가시키므로 **빌드 후 app.json에 되쓰이는 값이 없어 동기화 커밋이 필요 없다.**
  - 과거 `appVersionSource: "local"`일 때 git `app.json`의 versionCode가 스토어(Play Console) 실제 값보다 뒤처져(드리프트) 다운그레이드 제출 거부가 발생했다. remote로 전환해 재발을 막았다.
  - remote 카운터 초기값·수동 조정은 `eas build:version:set --platform android`(대화형). 현재 값 확인은 `eas build:version:get --platform android`.
- `runtimeVersion`은 `{ policy: "appVersion" }` — OTA 업데이트는 **동일 `version`을 가진 빌드에만** 적용된다. `version`을 올리면 그 빌드부터는 새 OTA 채널 대상이 된다. 그래서 커밋마다 기계적으로 범프하지 않고, 스토어 빌드를 낼 때만 올린다.
- `package.json`의 `version`은 **쓰이지 않는다.** Expo는 `app.json`만 읽는다. 버전 판단 근거로 삼지 말 것.

### 배포 전 버전 확인 (필수 — 모든 에이전트·사람 공통)

**`eas build`를 큐잉하기 전에 반드시 이 절차를 먼저 수행한다.** Claude Code·Codex·Cursor 등 어떤 에이전트로 작업하든, 사람이 직접 하든 동일하다. 자동 증가가 없으므로 이 확인을 건너뛰면 아래 두 사고가 그대로 재발한다.

```bash
node -p "require('./app.json').expo.version"   # 1. git이 들고 있는 표시 버전
pnpm exec eas build:list --limit 5 --non-interactive # 2. EAS에 이미 올라간 빌드들의 appVersion
```

1. **두 값이 같으면 그 버전은 이미 제출된 것** → `app.json`의 `version`을 올린 뒤 빌드한다.
   - 올리지 않고 제출하면 App Store Connect가 마케팅 버전(`CFBundleShortVersionString`)으로 빌드를 식별하기 때문에 **"이미 사용된 버전"으로 재제출을 거부**한다.
   - 범프 폭: 버그 수정·재빌드 → patch(`1.1.1` → `1.1.2`), 기능 추가 → minor(`1.1.2` → `1.2.0`).
2. **버전을 올렸으면 기능 PR을 머지하기 전에 같은 PR의 별도 커밋으로 반영한다.** 로컬에서만 고쳐 빌드하거나, 기능 PR 머지 후 version-only PR을 뒤늦게 만들지 않는다.
   - 커밋은 별도로 분리한다: `chore(mobile): 앱 버전 <이전> → <이후>`
   - 기능 PR을 머지하기 전에 커밋하며, **머지 없이 다음 배포로 넘어가지 않는다.**
3. 빌드 완료 후 `eas build:list --limit 2`로 **큐잉된 빌드의 appVersion이 의도한 값인지** 확인하고 결과 보고에 포함한다.

> 실제 사고 기록 — 둘 다 자동 증가가 있다고 오해해서 발생했다.
>
> - **2026-07-22**: `1.1.0`으로 재제출 → App Store Connect 거부 → `1.1.1`로 범프 후 재빌드 (PR #36).
> - **2026-08-03**: 같은 원인으로 `1.1.1` 빌드가 막혀 로컬에서 `1.1.2`로 고쳐 빌드했으나 **커밋하지 않아** 스토어는 `1.1.2`, `main`은 `1.1.1`인 드리프트 발생.

### 빌드 · 제출

> **먼저 위 [배포 전 버전 확인](#배포-전-버전-확인-필수--모든-에이전트사람-공통)을 수행한다.** `version`은 자동으로 올라가지 않는다.

```bash
pnpm exec eas build --platform android --profile production --non-interactive --no-wait # Android AAB
pnpm exec eas build --platform ios --profile production --non-interactive --no-wait     # iOS IPA
pnpm exec eas submit --platform android --profile internal --id <androidBuildId> --non-interactive
pnpm exec eas submit --platform ios --profile production --id <iosBuildId> --non-interactive
# QA 후
pnpm exec eas submit --platform android --profile production --id <androidBuildId> --non-interactive
```

- `eas.json`의 `submit.internal.android`는 내부 테스트 트랙, `submit.production.android`는 프로덕션 트랙으로 업로드한다.
- iOS `submit.production`은 App Store Connect/TestFlight 업로드 단계다. TestFlight QA 후 App Store Connect에서 심사 제출과 출시를 진행한다.
- Android 자격증명(keystore)·환경변수(`EXPO_PUBLIC_*`)는 EAS 원격에 설정돼 있다.

### EAS Update (OTA)

- `expo-updates` + `eas update:configure`로 셋업됨. `app.json`에 `updates.url`, `eas.json` 프로파일별 `channel`(production/preview/development) 지정.
- 네이티브 변경(새 라이브러리, app.json 네이티브 설정, SDK 업)이 **없는** JS/TS 수정은:
  ```bash
  pnpm eas:update:prod --message "<요약>"
  ```
  → 해당 채널·동일 runtimeVersion 빌드를 설치한 기기에 다음 실행 시 반영. 네이티브 변경이 있으면 OTA 불가 → 새 스토어 빌드 필요.
- production OTA는 원시 `eas update` 명령을 직접 조립하지 않고 위 package script를 사용한다. 이 스크립트의 `--environment production`을 제거하지 않는다.
- 이 프로젝트는 Expo SDK 54이므로 `--environment`를 생략하면 명령을 실행한 로컬/worktree의 `.env`로 폴백한다. gitignored `.env`가 없는 worktree에서 실행하면 `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 등이 번들에서 누락될 수 있다.
- `--environment production`은 EAS 서버의 production 환경 변수를 사용하고 로컬 `.env`는 사용하지 않는다. 필요한 `EXPO_PUBLIC_*` 값이 EAS production 환경에 등록되어 있는지도 배포 전에 확인한다. `eas.json`의 `build.<profile>.env`만으로는 EAS Update에 변수가 전달되지 않는다.
