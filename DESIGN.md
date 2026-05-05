# Design System — working-mom-dad-mobile

> Expo RN 셸의 디자인 시스템 컨텍스트. 메인 UI는 web에 있으므로 **네이티브 영역에 한정**된 토큰·컴포넌트만 다룬다.
> **현재 placeholder** — Figma MCP 연결 후 갱신.

---

## 1. 토큰 (TBD)

> 사용자 웹과 **공통 디자인 언어**를 공유하되, RN의 네이티브 컴포넌트(SafeArea, StatusBar, Tab Bar)에 맞춘 추가 토큰만 여기에.

| 영역 | 토큰 |
|---|---|
| 시스템 UI | `statusBar.style` (light/dark), `navigationBar.background` |
| Tab Bar | `tabBar.background`, `tabBar.active`, `tabBar.inactive` |
| SafeArea 인셋 | OS 자동, 토큰 X |

색상·타이포 토큰은 [web의 DESIGN.md](https://github.com/youth-corp/working-mom-dad-web/blob/main/DESIGN.md)와 동기화.

---

## 2. 컴포넌트 (Components)

네이티브 셸 영역만:

| 컴포넌트 | 역할 |
|---|---|
| `WebViewContainer` | 메인 UI를 띄우는 WebView 래퍼. `postMessage` 브릿지 포함 |
| `PushPermissionPrompt` | 첫 실행 시 푸시 권한 요청 |
| `BiometricGate` | 생체 인증 잠금 화면 |
| `OfflineBanner` | 네트워크 끊김 안내 |

> Expo의 기본 UI 컴포넌트(Tabs, Stack 등)는 `expo-router`/`@react-navigation/*` 그대로 사용.

---

## 3. 화면 (Screens)

대부분의 화면은 **WebView 안의 web**이 담당. 네이티브 화면은 셸 수준만:

| 영역 | 라우트 | 목적 |
|---|---|---|
| 스플래시 | `app/_layout.tsx` 진입 | 폰트·인증 로드 |
| 메인 (WebView) | `app/(tabs)/index.tsx` | working-mom-dad-web 임베드 |
| 프로필/설정 | `app/(tabs)/explore.tsx` | 네이티브 설정 (푸시 토글 등) |
| 모달 | `app/modal.tsx` | 카메라·갤러리 첨부 등 네이티브 시트 |

---

## 4. 작성 규칙 (Authoring rules)

### Do

- **SafeArea 항상 적용**: `react-native-safe-area-context`의 `SafeAreaView` 또는 `useSafeAreaInsets()` 사용
- **WebView ↔ Native 통신**: `postMessage` 프로토콜에 type discriminator 필수 (`{ type: "AUTH_TOKEN", payload: ... }`)
- **인증 토큰**: `expo-secure-store`로만 저장. AsyncStorage 금지
- **kebab-case 파일명**: `webview-bridge.tsx`
- **다크 모드**: OS 기본 추적 (`useColorScheme()`)

### Don't

- WebView 안에 들어갈 UI를 RN 네이티브로 다시 만들지 말 것 (web에 있으면 web에서)
- WebView에 인증 토큰을 URL 쿼리·해시로 전달 금지 (`postMessage` 또는 헤더만)
- AsyncStorage에 시크릿 보관 금지 (SecureStore)
- iOS/Android 분기를 한 컴포넌트 안에서 if-else로 처리 금지 — 플랫폼 specific 파일(`*.ios.tsx`, `*.android.tsx`) 사용

### 품질 게이트

1. `pnpm lint` 통과
2. iOS/Android 시뮬레이터 양쪽에서 SafeArea·StatusBar 확인
3. WebView 통신: web에서 네이티브 호출(예: 카메라) → 응답까지 라운드트립 검증

---

## 5. Figma MCP 연결 (TODO)

네이티브 스플래시·시작 화면 디자인 추가되면 갱신.
