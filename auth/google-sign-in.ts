import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { parseOAuthCallback } from "./oauth-callback";
import { getMobileSupabaseClient } from "./supabase-client";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_SIGN_IN_ERROR_MESSAGE =
  "Google 로그인에 실패했습니다. 다시 시도해 주세요.";

export class NativeGoogleSignInError extends Error {
  constructor(message = GOOGLE_SIGN_IN_ERROR_MESSAGE) {
    super(message);
    this.name = "NativeGoogleSignInError";
  }
}

export class NativeGoogleSignInCancelledError extends Error {
  constructor() {
    super("사용자가 Google 로그인을 취소했습니다.");
    this.name = "NativeGoogleSignInCancelledError";
  }
}

export function buildGoogleRedirectUri() {
  return makeRedirectUri({
    scheme: "yougabell",
    path: "auth/callback",
  });
}

export async function signInWithGoogleInBrowser() {
  const mobileSupabase = getMobileSupabaseClient();
  const redirectTo = buildGoogleRedirectUri();
  const { data, error } = await mobileSupabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data?.url) {
    throw new NativeGoogleSignInError(
      error?.message ?? "Google OAuth URL을 생성하지 못했습니다.",
    );
  }

  console.log("[google-sign-in] redirectTo", redirectTo);
  console.log("[google-sign-in] authUrl", data.url);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  console.log("[google-sign-in] browser result", JSON.stringify(result));

  if (result.type !== "success" || !result.url) {
    if (result.type === "cancel") {
      throw new NativeGoogleSignInCancelledError();
    }

    throw new NativeGoogleSignInError(
      `Google OAuth 결과를 처리하지 못했습니다. type=${result.type} url=${"url" in result ? (result.url ?? "none") : "none"}`,
    );
  }

  const callback = parseOAuthCallback(result.url);

  console.log("[google-sign-in] callback", JSON.stringify(callback));

  if (callback.kind === "session") {
    const { data: sessionData, error: setSessionError } =
      await mobileSupabase.auth.setSession({
        access_token: callback.accessToken,
        refresh_token: callback.refreshToken,
      });

    if (setSessionError || !sessionData.session) {
      throw new NativeGoogleSignInError(
        setSessionError?.message ?? "Supabase 세션 저장에 실패했습니다.",
      );
    }

    console.log("[google-sign-in] setSession success");
    return sessionData.session;
  }

  if (callback.kind === "error") {
    throw new NativeGoogleSignInError(
      `콜백에 code가 없습니다. params=${callback.paramKeys} error=${callback.error}`,
    );
  }

  const { data: sessionData, error: exchangeError } =
    await mobileSupabase.auth.exchangeCodeForSession(callback.code);

  if (exchangeError || !sessionData.session) {
    throw new NativeGoogleSignInError(
      exchangeError?.message ??
        `Supabase 세션 교환에 실패했습니다. code=${callback.code.slice(0, 12)}...`,
    );
  }

  console.log("[google-sign-in] exchangeCodeForSession success");
  return sessionData.session;
}
