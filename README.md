# yougabell-mobile

육아벨의 네이티브 셸. 직접 화면을 그리는 앱이 아니라, `yougabell-web`을 WebView로 띄우고 그 위에 네이티브 능력만 얹는 얇은 컨테이너다. 푸시 알림, 보안 저장소, 카메라, 딥링크 — 웹이 못 하는 것들만 담당한다.

이렇게 짜는 이유는 단순하다. UI를 web 한 곳에만 두면, 화면을 고칠 때 앱을 다시 빌드해서 스토어 심사를 받을 필요가 없다. web을 배포하는 순간 앱 사용자에게도 반영된다. 앱은 "OS와 web 사이의 다리" 역할에 집중한다.

Expo SDK 54 + React Native 0.81 기반이고, 빌드·배포는 EAS로 한다.

## 네이티브와 웹을 잇는 다리

이 레포의 심장은 `webview/webview-bridge.ts`다. WebView와 네이티브가 `postMessage`로 주고받는 메시지 프로토콜을 여기서 단일 정의한다. 모든 메시지는 `{ type, payload? }` 모양이고 타입이 붙어 있다.

웹 → 네이티브로 가는 것들: `REQUEST_NATIVE_GOOGLE_SIGN_IN`, `REQUEST_NATIVE_APPLE_SIGN_IN`, `REQUEST_PUSH_PERMISSION`, `OPEN_EXTERNAL_URL`, `ONBOARDING_COMPLETE`, `LOGOUT` 같은 요청. 네이티브 → 웹으로는 `SUPABASE_SESSION_SYNC`(토큰 주입)나 로그인 취소/실패 알림이 돌아온다. 양쪽 타입 정의가 한 파일에 있어서, web 레포의 `lib/native-bridge.ts`와 짝을 맞추기 쉽다.

부팅 흐름도 토큰을 URL에 싣는 흔한 안티패턴을 피한다. WebView가 뜨면 `window.__YOUGABELL_NATIVE__ = true` 플래그를 심고, web이 `WEB_READY`를 보낼 때까지 기다렸다가 그제서야 `SUPABASE_SESSION_SYNC`로 세션을 넣어준다. web이 초기화를 마친 뒤에 인증 상태를 노출하는 셈이다.

## 로그인은 OS 차원에서

WebView 안에서 OAuth 팝업은 신뢰하기 어렵다. 그래서 로그인은 네이티브가 직접 처리한다.

Google은 두 플랫폼 다 외부 보안 브라우저(`expo-web-browser`의 `openAuthSessionAsync`)로 OAuth를 돌린다. Apple은 iOS에서 native `expo-apple-authentication`으로 identity token을 받아 `signInWithIdToken`에 넘기고, Android에서는 브라우저 OAuth로 간다. `Platform.OS` 분기로 깔끔하게 갈라지고, 결국 둘 다 Supabase 세션이라는 같은 지점으로 수렴한다. 딥링크 스킴은 `yougabell://auth/callback`이고, 이건 Supabase redirect allow-list에 등록돼 있어야 한다.

## 세션을 SecureStore에 쪼개 담기

`expo-secure-store`에는 플랫폼별 항목 크기 제한이 있다. 그런데 Supabase JWT 세션은 종종 그 한도를 넘는다. 그래서 `auth/supabase-client.ts`의 커스텀 어댑터가 세션을 1800자 청크로 잘라 여러 키에 나눠 저장하고, 읽을 때 다시 합친다. Supabase SDK 입장에서는 평범한 스토리지처럼 보이지만, 실제로는 크기 제한 때문에 인증이 날아가는 사고를 막고 있다.

설정 누락도 부드럽게 처리한다. `EXPO_PUBLIC_SUPABASE_*`가 비어 있으면 그냥 던져서 SIGABRT로 죽는 대신, `getMobileSupabaseConfigError()`가 사용자에게 보여줄 문구를 돌려줘서 폴백 화면에 띄운다.

## Supabase 패치 한 장

`patches/`에 `@supabase/supabase-js` 패치가 하나 있다. Supabase SDK가 OpenTelemetry를 동적 import하려 드는데, React Native 번들 환경에서는 이게 트리셰이킹을 깨고 번들을 부풀린다. 그래서 `loadOtel()`이 그냥 `null`을 돌려주도록 막아뒀다. `pnpm`의 patch 기능으로 install 후 자동 적용된다.

## 라이브러리 메모

- **`react-native-webview`** — 이 앱의 본체. web을 띄우고 `postMessage`로 양방향 통신한다.
- **`expo-router`** — 파일 기반 라우팅. 셸은 화면이 몇 개 안 되지만(WebView 진입, OAuth 콜백) 딥링크 처리에 편하다.
- **`expo-notifications`** — 푸시. Android 13+는 `POST_NOTIFICATIONS` 런타임 권한, 그 이하와 iOS는 Notifications API로 처리하고, 권한 상태를 web에 다시 알려준다.
- **`expo-secure-store`** — 토큰 보관. AsyncStorage는 시크릿 저장에 안 쓴다.
- **`expo-apple-authentication` / `expo-auth-session` / `expo-web-browser`** — 위의 OAuth 흐름.
- **`expo-linear-gradient`** — 로딩 오버레이를 web 배경색(`#f1eaff → #e8eeff → #dff4ff`)과 똑같이 칠해서, 스플래시에서 web으로 넘어갈 때 색이 튀지 않게 한다.

## 시작하기

```bash
cp .env.example .env
pnpm install
pnpm start          # Metro
```

로컬 web에 붙여 개발하려면 `webview/dev-web-config.ts`의 오버라이드 토글을 켜고 URL을 바꾼다. 대표 주소는 iOS 시뮬레이터 `http://localhost:3000`, Android 에뮬레이터 `http://10.0.2.2:3000`, 실기기는 개발 PC의 로컬 IP를 직접 지정.

### EAS 빌드

```bash
pnpm exec eas login
pnpm eas:build:android:dev    # 또는 :preview / :prod, ios도 동일
```

`eas.json`에 development(내부 APK + dev client), preview(내부 APK), simulator(iOS), production(TestFlight/Play) 프로파일이 있다. production은 버전 코드를 자동 증가시킨다.

## 스택

Expo SDK 54 · React Native 0.81 · expo-router 6 · react-native-webview · Supabase Auth · TypeScript(strict) · pnpm · Node 24 LTS. EAS Build → TestFlight / Google Play Internal → 스토어.

## 관련 문서

- 네이티브 디자인 보강: [`DESIGN.md`](./DESIGN.md)
- 레포 전략 / 스키마 / 기능 기획: umbrella 레포 `yougabell`
  - [`yougabell/docs/design/00-repo-strategy.md`](https://github.com/four-lovely-fairies/yougabell/blob/main/docs/design/00-repo-strategy.md)
  - [`yougabell/docs/schema/`](https://github.com/four-lovely-fairies/yougabell/tree/main/docs/schema)
  - [`yougabell/docs/features/`](https://github.com/four-lovely-fairies/yougabell/tree/main/docs/features)
