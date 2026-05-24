import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

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
    throw new NativeGoogleSignInError();
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success" || !result.url) {
    throw new NativeGoogleSignInCancelledError();
  }

  const callbackUrl = new URL(result.url);
  const code = callbackUrl.searchParams.get("code");

  if (!code) {
    throw new NativeGoogleSignInError();
  }

  const { data: sessionData, error: exchangeError } =
    await mobileSupabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !sessionData.session) {
    throw new NativeGoogleSignInError();
  }

  return sessionData.session;
}
