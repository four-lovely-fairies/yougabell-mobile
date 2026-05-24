# Expo WebView Shell Design

## Context

`yougabell-mobile` is the React Native shell for the product. The main user interface already exists in `yougabell-web`, and the immediate goal is to ship an Expo app that opens the deployed web app inside a WebView using Expo development builds and EAS Build.

The current mobile repository is still close to the default Expo scaffold. For this task, the scaffold can be discarded and replaced with a focused WebView shell.

## Goal

Build a first mobile shell that:

- opens the deployed `yougabell-web` by default
- allows local web override during development builds
- shows a thin native loading state before the first page load completes
- shows a full-screen native error state with a retry action if the first load fails

## Non-Goals

This phase does not include:

- Supabase Auth token injection from native to web
- `postMessage` bridge contracts between native and web
- push notification entry handling
- deep link routing into web routes
- Android hardware back behavior
- external link interception
- file upload or camera integration from WebView

The existing web app continues to own web-side authentication, onboarding, loading states, and domain behavior.

## Recommended Architecture

Keep `expo-router`, but reduce the app to a single entry route and separate internal responsibilities into small modules.

### Route structure

- `app/_layout.tsx`: root layout only
- `app/index.tsx`: single route entry for the shell

### Module structure

- `webview/web-shell-screen.tsx`: composes the screen, owns shell state transitions
- `webview/use-webview-source.ts`: resolves the URL to load
- `webview/dev-web-config.ts`: development-only override candidates and toggle

This keeps the user-facing app simple while leaving a clean seam for later additions like auth handoff, native-web messaging, and deep-link entry logic.

## URL Resolution Policy

### Default source

Use `EXPO_PUBLIC_WEB_URL` as the canonical default URL. This should point to the deployed `yougabell-web` environment.

### Development override

Development builds may override the URL through a small config module with explicit candidates such as:

- iOS simulator: `http://localhost:3000`
- Android emulator: `http://10.0.2.2:3000`
- physical device: local network IP, set manually

### Selection rule

- production or preview-like app usage: always use `EXPO_PUBLIC_WEB_URL`
- development build: use the dev override only when the toggle is enabled
- if no dev override is enabled, fall back to `EXPO_PUBLIC_WEB_URL`

The first implementation should avoid a debug UI for switching URLs. A code-level toggle is enough for now.

## Shell State Model

The native shell should manage only the first-load container experience around the WebView.

### `loading`

Shown while the first WebView page is being loaded and before the page is considered ready.

The native loading UI should be intentionally thin. Its job is to prevent a blank white screen, not to reproduce the web app's internal loading UX.

### `ready`

Entered after the first page load completes successfully.

Once in `ready`, the WebView is fully responsible for the experience. Any loading related to login checks, onboarding gates, or home data fetching remains web-owned.

### `error`

Entered when the first page load fails or the initial navigation cannot be completed.

The error state should show:

- a simple error message
- a single `다시 시도` action

Retry should force the WebView to remount so the initial request is attempted again from a clean shell state.

## UX Boundaries

The shell should stay thin and avoid taking over responsibilities that belong to the web app.

- Native loading covers only the gap before the first page is visible.
- Web loading remains the source of truth once the page is running.
- Native error handling covers first-load failure only.
- No native header or tab chrome is added in this phase.

## Implementation Scope

### Included

- remove Expo starter tab/demo screens
- install and wire `react-native-webview`
- replace the default app flow with a single-shell route
- implement URL resolution from env plus dev override config
- implement native first-load loading state
- implement native first-load error state and retry
- update setup docs for Expo development build and EAS Build expectations

### Excluded

- native-managed login session sharing
- native-to-web bridge API
- push, deep links, and external navigation policies
- platform-specific advanced WebView behaviors

## Testing Strategy

### Static verification

- `pnpm lint` passes
- TypeScript errors are absent

### Manual verification

- the app opens the deployed web URL by default
- when development override is enabled, the app opens the selected local URL
- a thin native loading screen is visible before the first successful load
- when the initial load fails, the error screen appears
- tapping `다시 시도` reloads the WebView and retries the initial navigation

## Risks and Follow-Up

### Local network variance

Physical-device local development will depend on the developer's machine IP and network reachability. This is expected and should stay outside the first implementation scope.

### Auth continuity

If product requirements later demand seamless native-to-web session continuity, a separate design is needed for Supabase session handoff. That is intentionally postponed.

### Navigation policy growth

As soon as push links, deep links, or external OAuth callbacks need native handling, the shell will need a dedicated navigation policy layer. The proposed module boundaries are chosen to support that future split.
