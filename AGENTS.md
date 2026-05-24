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

> EAS 빌드: `eas build --platform ios|android` (별도 EAS 셋업 필요)

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
- **Google OAuth**: WebView 안에서 직접 시작하지 않는다. mobile이 외부 보안 브라우저 OAuth를 수행하고 WebView 세션을 동기화한다.
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

Supabase redirect allow-list에는 반드시 `yougabell://auth/callback`를 추가한다.

## 테스트 규칙

- RN 테스트는 **`@testing-library/react-native`만 사용**한다.
- **`@testing-library/jest-native`는 사용하지 않는다.** deprecated 상태이므로 다시 추가하지 않는다.
- matcher는 `@testing-library/react-native`의 내장 matcher를 기준으로 쓴다.

## 배포

EAS Build → TestFlight / Google Play Internal → 스토어.
