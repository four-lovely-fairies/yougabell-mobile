import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

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

  const callbackUrl = new URL(result.url);
  const code = callbackUrl.searchParams.get("code");

  if (!code) {
    throw new NativeAppleSignInError();
  }

  const { data: sessionData, error: exchangeError } =
    await mobileSupabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !sessionData.session) {
    throw new NativeAppleSignInError();
  }

  return sessionData.session;
}

async function signInWithAppleOnIos() {
  const isAvailable = await AppleAuthentication.isAvailableAsync();

  if (!isAvailable) {
    throw new NativeAppleSignInError();
  }

  try {
    const nonce = Crypto.randomUUID();
    const credential = await AppleAuthentication.signInAsync({
      nonce,
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new NativeAppleSignInError();
    }

    const { data, error } = await getMobileSupabaseClient().auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce,
      access_token: credential.authorizationCode ?? undefined,
    });

    if (error || !data.session) {
      throw new NativeAppleSignInError();
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

    throw new NativeAppleSignInError();
  }
}

export async function signInWithApple() {
  if (Platform.OS === "ios") {
    return signInWithAppleOnIos();
  }

  return signInWithAppleInBrowser();
}
