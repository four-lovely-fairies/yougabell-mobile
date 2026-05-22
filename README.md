# yougabell-mobile

> 육아밸 RN 셸. 네이티브 기능을 제공하고, 메인 UI는 `yougabell-web`을 WebView로 띄운다.

## Stack

- Expo SDK 54
- React Native 0.81
- expo-router 6
- react-native-webview
- TypeScript strict
- pnpm
- Node 24 LTS

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm start
```

## Environment

- `EXPO_PUBLIC_WEB_URL`
  - 기본 WebView 대상 URL
  - 배포된 `yougabell-web` 주소를 넣는다
- development build에서 로컬 웹을 붙이고 싶으면 `webview/dev-web-config.ts`에서 오버라이드 토글과 URL을 바꾼다

대표 로컬 URL 예시:

- iOS 시뮬레이터: `http://localhost:3000`
- Android 에뮬레이터: `http://10.0.2.2:3000`
- 실기기: 개발자 로컬 IP 직접 지정

## Development build / EAS

- 로컬 실행: `pnpm start`
- Android 개발 빌드 실행: `pnpm android`
- iOS 개발 빌드 실행: `pnpm ios`
- 프로덕션 빌드: `eas build --platform ios`
- 안드로이드 빌드: `eas build --platform android`

## Role

- WebView 컨테이너로 `yougabell-web` 표시
- 네이티브 영역만 담당:
  - 푸시 알림 (Expo Notifications)
  - 생체 인증 / 보안 저장소
  - 카메라 · 사진 (성장 기록)
  - 딥링크
  - SafeArea / 시스템 UI
- 현재 WebView 셸 1차 범위에서는 웹이 직접 로그인 상태를 처리
- DB 직접 접근 X — 모든 도메인 호출은 `yougabell-api`

## Hosting

EAS Build → 스토어 배포

## 관련 문서

- 워크스페이스 인덱스: [`../CLAUDE.md`](../CLAUDE.md) (로컬)
- 레포 전략 / 스키마 / 기능 기획: umbrella 레포 `yougabell`
  - [`yougabell/docs/design/00-repo-strategy.md`](https://github.com/four-lovely-fairies/yougabell/blob/main/docs/design/00-repo-strategy.md)
  - [`yougabell/docs/schema/`](https://github.com/four-lovely-fairies/yougabell/tree/main/docs/schema)
  - [`yougabell/docs/features/`](https://github.com/four-lovely-fairies/yougabell/tree/main/docs/features)
