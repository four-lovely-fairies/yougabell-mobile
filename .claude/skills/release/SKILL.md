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

## 2단계: /sync-docs 실행

```
/sync-docs today
```

- 오늘 커밋 중 문서 미반영 항목 점검
- 누락 시 문서 갱신 + 추가 커밋

## 3단계: 원격 푸시

```bash
git push origin <현재 브랜치>
```

- 보호 브랜치(`main` / `develop`)는 PR 흐름 권장 — 직접 푸시 전 사용자에게 확인
- 푸시 실패 시 사용자에게 보고하고 중단

## 4단계: 레포별 후속 배포

각 레포 `AGENTS.md`에 명시된 배포 절차를 따름.

| 레포                   | 배포 방식                                      |
| ---------------------- | ---------------------------------------------- |
| `yougabell` (umbrella) | docs-only — 별도 배포 없음                     |
| `yougabell-api`        | Render Web Service (`main` push에 auto-deploy) |
| `yougabell-web`        | Vercel 자동 배포 (`main` push에 트리거)        |
| `yougabell-admin`      | Vercel 자동 배포 (`main` push에 트리거)        |
| `yougabell-mobile`     | EAS Build — **아래 버전 게이트 통과 후** 빌드  |

### mobile 전용: 빌드 전 버전 게이트 (건너뛰지 않는다)

`app.json`의 `version`은 **자동으로 올라가지 않는다.** EAS `autoIncrement`가 올리는 것은 buildNumber/versionCode뿐이다. `eas build` 큐잉 전에:

```bash
node -p "require('./app.json').expo.version"   # git이 들고 있는 표시 버전
eas build:list --limit 5 --non-interactive     # 이미 EAS에 올라간 빌드의 appVersion
```

- 두 값이 같으면 → 이미 제출된 버전 → `app.json`의 `version`을 올리고 `chore(mobile): 앱 버전 <이전> → <이후>`로 **별도 커밋**한 뒤 빌드한다. 올리지 않으면 App Store Connect가 재제출을 거부한다.
- 버전을 올렸는데 커밋하지 않은 채 배포를 끝내지 않는다 (git ↔ 스토어 드리프트).
- 상세 규칙·사고 이력은 [`AGENTS.md`](../../../AGENTS.md)의 "배포 전 버전 확인" 참조.

## 5단계: 결과 보고

- 푸시된 커밋 목록 (`git log origin/<base>..HEAD --oneline` 또는 `git log --oneline -n <N>`)
- 트리거된 배포 (Vercel URL, EAS Build ID 등)
- mobile 빌드 시 **큐잉된 빌드의 appVersion**을 `eas build:list --limit 2`로 확인해 함께 보고
- 후속 수동 작업 (스토어 제출, 마이그레이션 적용 등)
