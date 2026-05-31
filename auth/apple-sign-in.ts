import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { parseOAuthCallback } from "./oauth-callback";
import { getMobileSupabaseClient } from "./supabase-client";

WebBrowser.maybeCompleteAuthSession();

const APPLE_SIGN_IN_ERROR_MESSAGE =
  "Apple 로그인에 실패했습니다. 다시 시도해 주세요.";

export class NativeAppleSignInError extends Error {
  constructor(message = APPLE_SIGN_IN_ERROR_MESSAGE) {
    super(message);
    this.name = "NativeAppleSignInError";
  }
}

export class NativeAppleSignInCancelledError extends Error {
  constructor() {
    super("사용자가 Apple 로그인을 취소했습니다.");
    this.name = "NativeAppleSignInCancelledError";
  }
}

function buildAppleRedirectUri() {
  return makeRedirectUri({
    scheme: "yougabell",
    path: "auth/callback",
  });
}

async function signInWithAppleInBrowser() {
  const mobileSupabase = getMobileSupabaseClient();
  const redirectTo = buildAppleRedirectUri();
  const { data, error } = await mobileSupabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    throw new NativeAppleSignInError();
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success" || !result.url) {
    throw new NativeAppleSignInCancelledError();
  }

  const callback = parseOAuthCallback(result.url);

  if (callback.kind === "session") {
    const { data: sessionData, error: setSessionError } =
      await mobileSupabase.auth.setSession({
        access_token: callback.accessToken,
        refresh_token: callback.refreshToken,
      });

    if (setSessionError || !sessionData.session) {
      throw new NativeAppleSignInError(
        setSessionError?.message ?? "Supabase 세션 저장에 실패했습니다.",
      );
    }

    return sessionData.session;
  }

  if (callback.kind === "error") {
    throw new NativeAppleSignInError(
      `콜백에 code가 없습니다. params=${callback.paramKeys} error=${callback.error}`,
    );
  }

  const { data: sessionData, error: exchangeError } =
    await mobileSupabase.auth.exchangeCodeForSession(callback.code);

  if (exchangeError || !sessionData.session) {
    throw new NativeAppleSignInError();
  }

  return sessionData.session;
}

async function signInWithAppleOnIos() {
  const isAvailable = await AppleAuthentication.isAvailableAsync();

  if (!isAvailable) {
    throw new NativeAppleSignInError(
      "이 기기에서 Apple 로그인을 사용할 수 없습니다. 시뮬레이터라면 Settings에서 Apple ID로 로그인했는지 확인해 주세요.",
    );
  }

  try {
    // nonce는 전달하지 않는다. expo-apple-authentication는 nonce를 그대로 Apple에
    // 넘기지만 토큰에는 해시된 값이 담겨 Supabase의 signInWithIdToken과 불일치할 수
    // 있다. Supabase 공식 Expo 가이드도 nonce를 쓰지 않으므로 생략한다.
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new NativeAppleSignInError(
        "Apple identityToken을 받지 못했습니다.",
      );
    }

    const { data, error } =
      await getMobileSupabaseClient().auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });

    if (error || !data.session) {
      throw new NativeAppleSignInError(
        error?.message ??
          "Supabase가 Apple 토큰을 거부했습니다. Apple provider의 authorized client ID에 bundle ID가 등록됐는지 확인해 주세요.",
      );
    }

    const givenName = credential.fullName?.givenName?.trim();
    const familyName = credential.fullName?.familyName?.trim();
    const fullName = [givenName, familyName].filter(Boolean).join(" ").trim();

    if (fullName) {
      await getMobileSupabaseClient().auth.updateUser({
        data: {
          full_name: fullName,
          given_name: givenName,
          family_name: familyName,
        },
      });
    }

    return data.session;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ERR_REQUEST_CANCELED"
    ) {
      throw new NativeAppleSignInCancelledError();
    }

    if (error instanceof NativeAppleSignInError) {
      throw error;
    }

    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : String(error);

    throw new NativeAppleSignInError(`Apple 로그인 실패: ${detail}`);
  }
}

export async function signInWithApple() {
  if (Platform.OS === "ios") {
    return signInWithAppleOnIos();
  }

  return signInWithAppleInBrowser();
}
