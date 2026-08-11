import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { openOAuthSession } from "./open-oauth-session";
import { parseOAuthCallback } from "./oauth-callback";
import { getMobileSupabaseClient } from "./supabase-client";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_SIGN_IN_ERROR_MESSAGE =
  "Google 로그인에 실패했습니다. 다시 시도해 주세요.";

let configuredGoogleWebClientId: string | null = null;

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

function requireGoogleWebClientId() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!webClientId) {
    throw new NativeGoogleSignInError(
      "Google 로그인 설정이 빌드에 포함되지 않았습니다.",
    );
  }

  return webClientId;
}

function configureNativeGoogleSignIn() {
  const webClientId = requireGoogleWebClientId();

  if (configuredGoogleWebClientId === webClientId) {
    return;
  }

  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });
  configuredGoogleWebClientId = webClientId;
}

async function signInWithGoogleNatively() {
  configureNativeGoogleSignIn();

  try {
    const hasPlayServices = await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    if (!hasPlayServices) {
      throw new NativeGoogleSignInError(
        "Google Play 서비스를 사용할 수 없습니다. 업데이트 후 다시 시도해 주세요.",
      );
    }

    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      throw new NativeGoogleSignInCancelledError();
    }

    const idToken = response.data.idToken;

    if (!idToken) {
      throw new NativeGoogleSignInError(
        "Google에서 로그인 토큰을 받지 못했습니다.",
      );
    }

    const { data, error } =
      await getMobileSupabaseClient().auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

    if (error || !data.session) {
      throw new NativeGoogleSignInError(
        error?.message ?? "Supabase 세션 저장에 실패했습니다.",
      );
    }

    return data.session;
  } catch (error) {
    if (
      error instanceof NativeGoogleSignInError ||
      error instanceof NativeGoogleSignInCancelledError
    ) {
      throw error;
    }

    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new NativeGoogleSignInError(
          "Google 로그인이 이미 진행 중입니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new NativeGoogleSignInError(
          "Google Play 서비스를 사용할 수 없습니다. 업데이트 후 다시 시도해 주세요.",
        );
      }

      if (error.code === "DEVELOPER_ERROR") {
        throw new NativeGoogleSignInError(
          "Google 로그인 앱 설정이 올바르지 않습니다.",
        );
      }
    }

    throw new NativeGoogleSignInError();
  }
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

  const callbackUrl = await openOAuthSession(data.url, redirectTo);

  if (!callbackUrl) {
    throw new NativeGoogleSignInCancelledError();
  }

  const callback = parseOAuthCallback(callbackUrl);

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
      exchangeError?.message ?? "Supabase 세션 교환에 실패했습니다.",
    );
  }

  return sessionData.session;
}

/** Android는 네이티브 Google Sign-In, iOS는 기존 보안 브라우저 OAuth를 사용한다. */
export async function signInWithGoogle() {
  if (Platform.OS === "android") {
    return signInWithGoogleNatively();
  }

  return signInWithGoogleInBrowser();
}

/** Supabase 로그아웃과 함께 Android Google SDK의 로컬 로그인 상태도 정리한다. */
export async function signOutFromGoogleIfNative() {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    configureNativeGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    // Supabase 로그아웃은 계속한다. 다음 signIn에서 계정 선택이 다시 표시된다.
  }
}
