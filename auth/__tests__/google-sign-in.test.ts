import { Platform } from "react-native";

import {
  NativeGoogleSignInCancelledError,
  NativeGoogleSignInError,
  signInWithGoogle,
  signOutFromGoogleIfNative,
} from "../google-sign-in";

const mockConfigure = jest.fn();
const mockHasPlayServices = jest.fn();
const mockNativeSignIn = jest.fn();
const mockNativeSignOut = jest.fn();
const mockSignInWithIdToken = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockOpenOAuthSession = jest.fn();

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: (...args: unknown[]) => mockConfigure(...args),
    hasPlayServices: (...args: unknown[]) => mockHasPlayServices(...args),
    signIn: (...args: unknown[]) => mockNativeSignIn(...args),
    signOut: (...args: unknown[]) => mockNativeSignOut(...args),
  },
  isCancelledResponse: (response: { type: string }) =>
    response.type === "cancelled",
  isErrorWithCode: (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error,
  statusCodes: {
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
    DEVELOPER_ERROR: "DEVELOPER_ERROR",
  },
}));

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "yougabell://auth/callback"),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock("../open-oauth-session", () => ({
  openOAuthSession: (...args: unknown[]) => mockOpenOAuthSession(...args),
}));

jest.mock("../supabase-client", () => ({
  getMobileSupabaseClient: () => ({
    auth: {
      signInWithIdToken: (...args: unknown[]) => mockSignInWithIdToken(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      exchangeCodeForSession: (...args: unknown[]) =>
        mockExchangeCodeForSession(...args),
    },
  }),
}));

describe("Android native Google sign-in", () => {
  const originalPlatform = Platform.OS;
  const originalClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  beforeAll(() => {
    Object.defineProperty(Platform, "OS", { value: "android" });
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
      "web-client.apps.googleusercontent.com";
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPlayServices.mockResolvedValue(true);
    mockNativeSignIn.mockResolvedValue({
      type: "success",
      data: { idToken: "google-id-token" },
    });
    mockNativeSignOut.mockResolvedValue(null);
    mockSignInWithIdToken.mockResolvedValue({
      data: { session: { access_token: "supabase-access-token" } },
      error: null,
    });
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/auth" },
      error: null,
    });
    mockOpenOAuthSession.mockResolvedValue(
      "yougabell://auth/callback?code=oauth-code",
    );
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "ios-supabase-access-token" } },
      error: null,
    });
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", { value: originalPlatform });
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalClientId;
  });

  it("Google ID Token을 Supabase 세션으로 교환한다", async () => {
    await expect(signInWithGoogle()).resolves.toEqual({
      access_token: "supabase-access-token",
    });

    expect(mockHasPlayServices).toHaveBeenCalledWith({
      showPlayServicesUpdateDialog: true,
    });
    expect(mockNativeSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "google-id-token",
    });
  });

  it("사용자가 계정 선택을 닫으면 취소 오류를 반환한다", async () => {
    mockNativeSignIn.mockResolvedValue({ type: "cancelled", data: null });

    await expect(signInWithGoogle()).rejects.toBeInstanceOf(
      NativeGoogleSignInCancelledError,
    );
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
  });

  it("ID Token이 없으면 로그인 실패로 처리한다", async () => {
    mockNativeSignIn.mockResolvedValue({
      type: "success",
      data: { idToken: null },
    });

    await expect(signInWithGoogle()).rejects.toMatchObject({
      name: "NativeGoogleSignInError",
      message: "Google에서 로그인 토큰을 받지 못했습니다.",
    });
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
  });

  it("Supabase 교환 실패를 로그인 오류로 전달한다", async () => {
    mockSignInWithIdToken.mockResolvedValue({
      data: { session: null },
      error: { message: "invalid id token" },
    });

    await expect(signInWithGoogle()).rejects.toEqual(
      expect.objectContaining<Partial<NativeGoogleSignInError>>({
        name: "NativeGoogleSignInError",
        message: "invalid id token",
      }),
    );
  });

  it("로그아웃 시 Google SDK 상태도 정리한다", async () => {
    await signOutFromGoogleIfNative();

    expect(mockNativeSignOut).toHaveBeenCalledTimes(1);
  });

  it("iOS에서는 기존 보안 브라우저 OAuth를 유지한다", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });

    try {
      await expect(signInWithGoogle()).resolves.toEqual({
        access_token: "ios-supabase-access-token",
      });

      expect(mockNativeSignIn).not.toHaveBeenCalled();
      expect(mockOpenOAuthSession).toHaveBeenCalledWith(
        "https://accounts.google.com/o/oauth2/auth",
        "yougabell://auth/callback",
      );
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    } finally {
      Object.defineProperty(Platform, "OS", { value: "android" });
    }
  });
});
