# working-mom-dad-mobile

> Expo RN 셸. 네이티브 기능 + WebView 컨테이너.
> 워크스페이스 전체 컨벤션은 [`../CLAUDE.md`](../CLAUDE.md), 글로벌은 `~/.claude/CLAUDE.md` 참조.

## 스택

- Expo (SDK TBD)
- React Native
- TypeScript strict
- pnpm, Node 24 LTS
- EAS Build

## 핵심 원칙

- **얇은 셸**: UI는 가능한 한 `working-mom-dad-web`이 담당. RN은 네이티브 영역만.
- **DB 직접 접근 금지**: 모든 도메인 호출은 `working-mom-dad-api`로.
- **인증**: Supabase Auth SDK. 토큰은 SecureStore에 저장하고 WebView로 안전하게 전달.
- **네이티브 기능 범위**:
  - 푸시 알림 (Expo Notifications)
  - 생체 인증 / SecureStore
  - 카메라 · 사진 (성장 기록 첨부)
  - 딥링크
- **WebView ↔ Native 통신**: postMessage 프로토콜 정의 필요 (TBD).

## 디렉토리 (예정)

```
src/
├── app/                 # expo-router
├── webview/             # WebView 컨테이너 + 통신 브릿지
├── auth/                # Supabase Auth SDK
├── notifications/       # 푸시
├── lib/
└── components/
```

## 환경 변수

`EXPO_PUBLIC_*`은 빌드 타임 노출. EAS Secrets로 환경별 분리.

## 배포

EAS Build → TestFlight / Google Play Internal → 스토어.
