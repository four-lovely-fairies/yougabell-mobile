# yougabell-mobile

> 육아밸 — RN 셸. 네이티브 기능을 제공하고, 메인 UI는 `yougabell-web`을 WebView로 띄운다.
> Expo + TypeScript.

## Stack

- Expo (SDK TBD)
- React Native
- TypeScript (strict)
- pnpm
- Node 24 LTS

## Quick start

```bash
nvm use
pnpm install
cp .env.example .env
pnpm start
```

## Role

- WebView 컨테이너로 `yougabell-web` 표시
- 네이티브 영역만 담당:
  - 푸시 알림 (Expo Notifications)
  - 생체 인증 / 보안 저장소
  - 카메라 · 사진 (성장 기록)
  - 딥링크
  - SafeArea / 시스템 UI
- Supabase Auth는 SDK로 처리 (토큰을 WebView에 전달)
- DB 직접 접근 X — 모든 도메인 호출은 `yougabell-api`

## Hosting

EAS Build → 스토어 배포

## 관련 문서

- 워크스페이스 인덱스: [`../CLAUDE.md`](../CLAUDE.md) (로컬)
- 레포 전략 / 스키마 / 기능 기획: umbrella 레포 `yougabell`
  - [`yougabell/docs/design/00-repo-strategy.md`](https://github.com/four-lovely-fairies/yougabell/blob/main/docs/design/00-repo-strategy.md)
  - [`yougabell/docs/schema/`](https://github.com/four-lovely-fairies/yougabell/tree/main/docs/schema)
  - [`yougabell/docs/features/`](https://github.com/four-lovely-fairies/yougabell/tree/main/docs/features)
