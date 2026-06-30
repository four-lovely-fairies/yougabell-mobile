import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

// 딥링크 콜백이 브라우저 dismiss보다 약간 늦게 도착할 수 있어 짧게 유예한다.
const DEEP_LINK_GRACE_MS = 1500;

/**
 * 외부 보안 브라우저로 OAuth를 수행하고 콜백 URL을 반환한다. 콜백을 받지 못하면
 * null(사용자 취소)을 반환한다.
 *
 * Android에서는 Supabase가 커스텀 스킴(`yougabell://auth/callback`)으로 302
 * 리다이렉트하면 expo-router의 딥링크 intent-filter가 이를 가로채 앱을 다시 띄운다.
 * 그 결과 Chrome Custom Tab은 dismiss되고 `openAuthSessionAsync`는 `{ type: "dismiss" }`만
 * 반환하며, 인증 콜백은 WebBrowser 결과가 아니라 `Linking` 딥링크 이벤트로 도착한다.
 * iOS의 `ASWebAuthenticationSession`은 스킴을 내부에서 가로채 success를 반환하므로 이
 * 우회가 필요 없다.
 *
 * 두 경로(WebBrowser success · Linking 딥링크)를 함께 기다려 먼저 도착하는 콜백 URL을 쓴다.
 */
export async function openOAuthSession(
  authUrl: string,
  redirectTo: string,
): Promise<string | null> {
  let resolveRedirect: (url: string | null) => void = () => {};
  const redirectFromDeepLink = new Promise<string | null>((resolve) => {
    resolveRedirect = resolve;
  });

  const subscription = Linking.addEventListener("url", ({ url }) => {
    if (url.startsWith(redirectTo)) {
      resolveRedirect(url);
    }
  });

  try {
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);

    if (result.type === "success" && result.url) {
      return result.url;
    }

    // Android: 브라우저는 dismiss됐지만 딥링크로 콜백이 이미 도착했거나 곧 도착할 수 있다.
    return await Promise.race([
      redirectFromDeepLink,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), DEEP_LINK_GRACE_MS);
      }),
    ]);
  } finally {
    subscription.remove();
  }
}
