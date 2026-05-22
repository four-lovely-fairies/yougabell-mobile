# WebView Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expo 앱이 배포된 `yougabell-web`을 기본으로 띄우고, development build에서 로컬 오버라이드와 첫 로딩/에러 재시도를 지원하는 얇은 WebView 셸을 만든다.

**Architecture:** `expo-router`는 유지하되 앱 엔트리는 `app/index.tsx` 하나로 줄인다. URL 결정은 순수 함수와 훅으로 분리해 테스트하고, 실제 화면은 `webview/` 모듈에서 WebView와 로딩/에러 상태를 관리한다.

**Tech Stack:** Expo SDK 54, expo-router, react-native-webview, TypeScript strict, Jest

---

### Task 1: 테스트 인프라와 URL 결정 로직 준비

**Files:**

- Create: `webview/dev-web-config.ts`
- Create: `webview/webview-source.ts`
- Create: `webview/__tests__/webview-source.test.ts`
- Create: `jest.config.js`
- Create: `jest.setup.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: URL 결정 테스트를 먼저 작성**

```ts
import { describe, expect, it } from "@jest/globals";

import { resolveWebviewUrl } from "../webview-source";

describe("resolveWebviewUrl", () => {
  it("개발 오버라이드가 켜진 development build에서는 override URL을 우선 사용한다", () => {
    const result = resolveWebviewUrl({
      defaultUrl: "https://web.yougabell.com",
      isDev: true,
      overrideEnabled: true,
      overrideUrl: "http://10.0.2.2:3000",
    });

    expect(result).toBe("http://10.0.2.2:3000");
  });

  it("development build에서도 오버라이드가 꺼져 있으면 기본 URL을 사용한다", () => {
    const result = resolveWebviewUrl({
      defaultUrl: "https://web.yougabell.com",
      isDev: true,
      overrideEnabled: false,
      overrideUrl: "http://10.0.2.2:3000",
    });

    expect(result).toBe("https://web.yougabell.com");
  });

  it("production 성격에서는 오버라이드가 켜져 있어도 기본 URL을 사용한다", () => {
    const result = resolveWebviewUrl({
      defaultUrl: "https://web.yougabell.com",
      isDev: false,
      overrideEnabled: true,
      overrideUrl: "http://10.0.2.2:3000",
    });

    expect(result).toBe("https://web.yougabell.com");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm test webview-source`
Expected: FAIL because `webview-source.ts` or test command does not exist yet

- [ ] **Step 3: Jest 설정과 최소 구현 추가**

```ts
export type ResolveWebviewUrlInput = {
  defaultUrl: string;
  isDev: boolean;
  overrideEnabled: boolean;
  overrideUrl?: string;
};

export function resolveWebviewUrl(input: ResolveWebviewUrlInput) {
  if (input.isDev && input.overrideEnabled && input.overrideUrl) {
    return input.overrideUrl;
  }

  return input.defaultUrl;
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `pnpm test webview-source`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add package.json tsconfig.json jest.config.js jest.setup.ts webview/dev-web-config.ts webview/webview-source.ts webview/__tests__/webview-source.test.ts
git commit -m "test(mobile): WebView URL 결정 로직 추가"
```

### Task 2: WebView 셸 화면 구현

**Files:**

- Create: `webview/use-webview-source.ts`
- Create: `webview/web-shell-screen.tsx`
- Create: `webview/web-shell-styles.ts`
- Modify: `app/_layout.tsx`
- Create: `app/index.tsx`

- [ ] **Step 1: 화면 상태 테스트를 먼저 작성**

```ts
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { WebShellScreen } from '../web-shell-screen';

jest.mock('../use-webview-source', () => ({
  useWebviewSource: () => ({
    uri: 'https://web.yougabell.com',
  }),
}));

describe('WebShellScreen', () => {
  it('초기에는 로딩 문구를 보여준다', () => {
    render(<WebShellScreen />);

    expect(screen.getByText('육아밸을 불러오는 중이에요')).toBeTruthy();
  });

  it('에러 발생 시 다시 시도 버튼을 보여준다', () => {
    render(<WebShellScreen />);

    fireEvent(screen.getByTestId('webview-shell'), 'error', {
      nativeEvent: { description: 'network error' },
    });

    expect(screen.getByText('다시 시도')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm test web-shell-screen`
Expected: FAIL because `WebShellScreen` and test harness do not exist yet

- [ ] **Step 3: 최소 WebView 셸 구현**

```tsx
export function WebShellScreen() {
  const source = useWebviewSource();
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <View style={styles.container}>
      {phase === "error" ? (
        <Pressable
          onPress={() => {
            setPhase("loading");
            setReloadKey((value) => value + 1);
          }}
        >
          <Text>다시 시도</Text>
        </Pressable>
      ) : null}

      <WebView
        key={reloadKey}
        testID="webview-shell"
        source={source}
        onLoadEnd={() => setPhase("ready")}
        onError={() => setPhase("error")}
      />
    </View>
  );
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `pnpm test web-shell-screen`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add app/_layout.tsx app/index.tsx webview/use-webview-source.ts webview/web-shell-screen.tsx webview/web-shell-styles.ts
git commit -m "feat(mobile): Expo WebView 셸 화면 구현"
```

### Task 3: 기본 스캐폴드 제거와 문서 정리

**Files:**

- Delete: `app/(tabs)/_layout.tsx`
- Delete: `app/(tabs)/explore.tsx`
- Delete: `app/(tabs)/index.tsx`
- Delete: `app/modal.tsx`
- Delete: `components/external-link.tsx`
- Delete: `components/haptic-tab.tsx`
- Delete: `components/hello-wave.tsx`
- Delete: `components/parallax-scroll-view.tsx`
- Delete: `components/themed-text.tsx`
- Delete: `components/themed-view.tsx`
- Delete: `components/ui/collapsible.tsx`
- Delete: `components/ui/icon-symbol.ios.tsx`
- Delete: `components/ui/icon-symbol.tsx`
- Delete: `constants/theme.ts`
- Delete: `hooks/use-color-scheme.ts`
- Delete: `hooks/use-color-scheme.web.ts`
- Delete: `hooks/use-theme-color.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `app.json`

- [ ] **Step 1: 문서 기대값을 먼저 정리**

````md
## Quick start

```bash
cp .env.example .env
pnpm install
pnpm start
```
````

## Environment

- `EXPO_PUBLIC_WEB_URL`: 기본 WebView 대상 URL
- development build에서는 `webview/dev-web-config.ts`에서 로컬 URL 오버라이드 가능

````

- [ ] **Step 2: 불필요한 Expo 예제 구조 제거와 설정 정리**

```json
{
  "expo": {
    "name": "yougabell",
    "slug": "yougabell-mobile",
    "scheme": "yougabell",
    "plugins": ["expo-router"]
  }
}
````

- [ ] **Step 3: 검증 실행**

Run:

- `pnpm test`
- `pnpm lint`

Expected:

- Jest PASS
- ESLint PASS

- [ ] **Step 4: 커밋**

```bash
git add .env.example README.md app.json app components constants hooks
git commit -m "chore(mobile): Expo 기본 스캐폴드 정리"
```
