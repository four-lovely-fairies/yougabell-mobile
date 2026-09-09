---
name: release
description: 변경사항 커밋 → 문서 동기화 → 원격 푸시까지 릴리즈 전체 과정을 수행합니다. 레포별 후속 배포 절차는 AGENTS.md 참조.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Skill
---

# 릴리즈

## 중요: 모든 변경사항 커밋 필수

- `git status`에 남은 변경사항이 없어야 다음 단계로 진행
- staged/unstaged/untracked 모든 파일을 빠짐없이 커밋 (package.json, lock 파일 포함)
- 변경사항을 임의로 제외하지 않음

## 1단계: /finish 실행

변경사항 분석 → 문서 업데이트 → 포매팅 → 한글 Conventional Commits 커밋:

```
/finish
```

- 커밋 후 `git status`로 남은 변경사항 없음을 반드시 확인
- 확인 완료 후 다음 단계 진행

## 2단계: mobile 네이티브 재빌드·버전 게이트 (PR 머지 전에 수행)

`yougabell-mobile`에서는 현재 브랜치 전체 변경을 base branch와 비교하여 새 스토어 바이너리가 필요한지 판별한다. 이 단계는 **push·PR 머지·EAS Build보다 먼저** 수행한다.

새 바이너리가 필요한 대표 변경:

- `ios/`, `android/`, `modules/`, config plugin(`plugins/`)의 변경
- 네이티브 모듈 추가·변경, Expo SDK 변경
- `app.json`의 plugins·권한·아이콘·스플래시·네이티브 설정 변경

JS/TS만 바뀌었고 기존 바이너리로 EAS Update가 가능한 작업이면 버전을 올리지 않는다.

새 바이너리가 필요하면:

```bash
node -p "require('./app.json').expo.version"
pnpm exec eas build:list --limit 5 --non-interactive
```

- 현재 `app.json` version이 기존 EAS production 빌드에 이미 사용되었으면 patch version을 올린다.
- 버전 변경은 `chore(mobile): 앱 버전 <이전> → <이후>`라는 **별도 커밋**으로 만들고, 기능 변경과 같은 PR에 포함한다.
- 버전 범프 없이 PR을 머지한 다음 version-only 후속 PR을 만들지 않는다.
- 여러 플랫폼을 한 번에 배포해도 `app.json` version은 한 번만 올린다. buildNumber/versionCode는 EAS remote autoIncrement가 별도로 관리한다.
- 같은 스토어 릴리스의 빌드가 컴파일·서명·제출 전에 실패하여 동일 플랫폼을 재시도하는 경우에는 `app.json` version을 다시 올리지 않는다. 성공한 다른 플랫폼과 같은 표시 버전을 유지하고, EAS remote autoIncrement가 실패한 플랫폼의 buildNumber/versionCode만 새로 발급하게 한다.

## 3단계: /sync-docs 실행

```
/sync-docs today
```

- 오늘 커밋 중 문서 미반영 항목 점검
- 누락 시 문서 갱신 + 추가 커밋

## 4단계: 원격 푸시

```bash
git push origin <현재 브랜치>
```

- 보호 브랜치(`main` / `develop`)는 PR 흐름 권장 — 직접 푸시 전 사용자에게 확인
- 푸시 실패 시 사용자에게 보고하고 중단

## 5단계: 레포별 후속 배포

각 레포 `AGENTS.md`에 명시된 배포 절차를 따름.

| 레포                   | 배포 방식                                      |
| ---------------------- | ---------------------------------------------- |
| `yougabell` (umbrella) | docs-only — 별도 배포 없음                     |
| `yougabell-api`        | Render Web Service (`main` push에 auto-deploy) |
| `yougabell-web`        | Vercel 자동 배포 (`main` push에 트리거)        |
| `yougabell-admin`      | Vercel 자동 배포 (`main` push에 트리거)        |
| `yougabell-mobile`     | EAS Build — **아래 버전 게이트 통과 후** 빌드  |

`yougabell-mobile` 변경이 기존 바이너리에 OTA 가능한 JS/TS-only 작업이면 production 배포에 다음 package script만 사용한다.

```bash
pnpm eas:update:prod --message "<요약>"
```

이 스크립트에 고정된 `--environment production`을 제거하거나, 해당 옵션 없는 원시 `eas update`로 대체하지 않는다. Expo SDK 54에서는 옵션을 생략할 경우 실행 환경의 로컬 `.env`로 폴백하여 Supabase 등 `EXPO_PUBLIC_*` 값이 누락될 수 있다.

### mobile 전용: 빌드 직전 재확인 (마지막 안전장치)

2단계에서 이미 버전 범프가 같은 PR에 포함되어 있어야 한다. `app.json`의 `version`은 자동으로 올라가지 않으며, EAS `autoIncrement`가 올리는 것은 buildNumber/versionCode뿐이다. `eas build` 큐잉 직전에 아래를 다시 확인한다.

```bash
node -p "require('./app.json').expo.version"   # git이 들고 있는 표시 버전
pnpm exec eas build:list --limit 5 --non-interactive # 이미 EAS에 올라간 빌드의 appVersion
```

- 두 값이 같으면 빌드하지 않는다. PR 단계의 버전 범프가 빠진 것이므로 새 브랜치·PR로 먼저 main을 바로잡는다.
- 로컬에서만 version을 고쳐 빌드하지 않는다. 반드시 git main과 스토어 버전을 일치시킨다.
- 상세 규칙·사고 이력은 [`AGENTS.md`](../../../AGENTS.md)의 "배포 전 버전 확인" 참조.

## 6단계: 결과 보고

- 푸시된 커밋 목록 (`git log origin/<base>..HEAD --oneline` 또는 `git log --oneline -n <N>`)
- 트리거된 배포 (Vercel URL, EAS Build ID 등)
- mobile 빌드 시 **큐잉된 빌드의 appVersion**을 `pnpm exec eas build:list --limit 2`로 확인해 함께 보고
- 후속 수동 작업 (스토어 제출, 마이그레이션 적용 등)
