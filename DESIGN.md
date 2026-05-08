# Design System — yougabell-mobile

> Expo RN 셸의 디자인 시스템. 메인 UI는 web에 있으므로 **네이티브 영역에 한정**된 토큰·컴포넌트만 다룬다.
> **단일 진실의 소스**: [yougabell-web `DESIGN.md`](https://github.com/four-lovely-fairies/yougabell-web/blob/main/DESIGN.md) — Color/Typography/Radius/Spacing/Elevation/Icons.

---

## 0. Figma 출처

- 메인 화면은 web의 Figma 노드를 그대로 사용 (네이티브에서 별도 디자인 없음 — WebView 임베드).
- 네이티브 셸 화면(스플래시, 권한 요청, 잠금)은 디자인 추가 시 노드 ID 갱신.
- 토큰 출처: [Yougabell OS Figma](https://www.figma.com/design/sKdG5GEBZPdMjFY9nYj5g0).

---

## 1. 토큰 — web과 공유

웹과 동일한 색상·타이포·간격·radius·elevation·아이콘 시스템을 사용. 차이는 **적용 대상**(네이티브 시스템 UI):

| 영역              | 매핑                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| StatusBar 컬러    | `bar-style="dark-content"` (라이트 테마), `light-content` (다크 테마) |
| StatusBar 배경    | `gray.0` (라이트), `gray.800` (다크)                                  |
| Tab Bar 배경      | `gray.0`                                                              |
| Tab Bar active    | `primary.500` (`#754AF6`)                                             |
| Tab Bar inactive  | `gray.500` (`#7B7B7B`)                                                |
| Splash 배경       | `primary.500` 또는 `gray.0` (확정 전)                                 |
| Loading indicator | `primary.500`                                                         |

> RN에서 hex 토큰을 직접 import하기 위해 `constants/colors.ts`를 두고 web의 토큰과 동일한 hex를 유지. 변경 시 두 파일 동시 갱신.

### Typography (네이티브)

- 한글: **Pretendard** (Expo asset 로딩 — `expo-font`)
- 시스템 fallback: iOS `San Francisco`, Android `Roboto`
- 본문 기본: `body.1` (16/26)
- 시스템 UI(상태바, 탭 라벨): `caption.1` (12/20)

---

## 2. 컴포넌트 — 네이티브 셸만

| 컴포넌트               | 역할                                                     | 비고                                   |
| ---------------------- | -------------------------------------------------------- | -------------------------------------- |
| `WebViewContainer`     | 메인 UI를 띄우는 WebView 래퍼. `postMessage` 브릿지 포함 | 핵심                                   |
| `PushPermissionPrompt` | 첫 실행 시 푸시 권한 요청                                | OS 다이얼로그 + 사전 안내 시트         |
| `BiometricGate`        | 생체 인증 잠금 화면                                      | iOS Face/Touch ID, Android Fingerprint |
| `OfflineBanner`        | 네트워크 끊김 안내                                       | 상단 inset 고려                        |

> Expo의 기본 UI 컴포넌트(`Tabs`, `Stack` 등)는 `expo-router`/`@react-navigation/*` 기본형 그대로 사용.

---

## 3. 화면 (Screens)

대부분 화면은 **WebView 안의 web**이 담당. 네이티브 화면은 셸 수준만:

| 영역           | 라우트                   | 목적                                |
| -------------- | ------------------------ | ----------------------------------- |
| 스플래시       | `app/_layout.tsx` 진입   | 폰트·인증 로드                      |
| 메인 (WebView) | `app/(tabs)/index.tsx`   | yougabell-web 임베드                |
| 프로필/설정    | `app/(tabs)/explore.tsx` | 네이티브 설정 (푸시 토글 등)        |
| 모달           | `app/modal.tsx`          | 카메라·갤러리 첨부 등 네이티브 시트 |

---

## 4. 작성 규칙 (Authoring rules)

### Do

- **SafeArea 항상 적용**: `react-native-safe-area-context`의 `SafeAreaView` 또는 `useSafeAreaInsets()`
- **WebView ↔ Native 통신**: `postMessage` 프로토콜에 type discriminator 필수 (`{ type: "AUTH_TOKEN", payload: ... }`)
- **인증 토큰**: `expo-secure-store`로만 저장. AsyncStorage 금지
- **kebab-case 파일명**: `webview-bridge.tsx`
- **다크 모드**: OS 기본 추적 (`useColorScheme()`)
- **색상**: `constants/colors.ts`의 토큰만 import. hex literal 금지
- **터치 타겟**: 최소 44pt (iOS HIG) / 48dp (Android Material) — `space.10` (48px)이 안전선

### Don't

- WebView 안에 들어갈 UI를 RN 네이티브로 다시 만들지 말 것 (web에 있으면 web에서)
- WebView에 인증 토큰을 URL 쿼리·해시로 전달 금지 (`postMessage` 또는 헤더만)
- AsyncStorage에 시크릿 보관 금지 (SecureStore)
- iOS/Android 분기를 한 컴포넌트 안에서 if-else로 처리 금지 — 플랫폼 specific 파일(`*.ios.tsx`, `*.android.tsx`) 사용
- web 토큰을 모바일에서 임의로 재정의 금지 — 동일 hex 유지

### 품질 게이트

1. `pnpm lint` 통과
2. iOS/Android 시뮬레이터 양쪽에서 SafeArea·StatusBar 확인
3. WebView 통신: web에서 네이티브 호출(예: 카메라) → 응답까지 라운드트립 검증
4. Pretendard 폰트 로딩 확인 (`expo-font` 로딩 완료 후 splash hide)

---

## 5. Figma MCP 연결

네이티브 스플래시·시작 화면 디자인이 추가되면 갱신. 호출 방식은 web `DESIGN.md` 10번 섹션과 동일 (fileKey 공유).
