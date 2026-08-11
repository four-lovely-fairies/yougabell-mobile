import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import React from "react";

import { WebShellScreen } from "../web-shell-screen";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../use-webview-source", () => ({
  useWebviewSource: () => ({
    uri: "https://web.yougabell.com",
  }),
}));

jest.mock("../../auth/google-sign-in", () => ({
  signInWithGoogle: jest.fn(),
  signOutFromGoogleIfNative: jest.fn(),
  NativeGoogleSignInCancelledError: class NativeGoogleSignInCancelledError extends Error {},
  NativeGoogleSignInError: class NativeGoogleSignInError extends Error {},
}));

jest.mock("../../auth/apple-sign-in", () => ({
  signInWithApple: jest.fn(),
  NativeAppleSignInCancelledError: class NativeAppleSignInCancelledError extends Error {},
  NativeAppleSignInError: class NativeAppleSignInError extends Error {},
}));

jest.mock("../../auth/supabase-client", () => ({
  getMobileSupabaseConfigError: () => null,
  getMobileSupabaseClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn(),
    },
  }),
}));

jest.mock("../push-permission", () => ({
  requestPushPermission: jest.fn().mockResolvedValue("granted"),
  requestPushPermissionAndRegister: jest.fn().mockResolvedValue("granted"),
  registerPushTokenIfGranted: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("react-native-webview", () => ({
  WebView: ({
    onError,
    onLoad,
    onLoadEnd,
    onMessage,
    testID,
  }: {
    onError: (event: unknown) => void;
    onLoad: () => void;
    onLoadEnd: () => void;
    onMessage: (event: unknown) => void;
    testID: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require("react");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require("react-native");

    React.useEffect(() => {
      onLoad();
      onLoadEnd();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return React.createElement(
      Text,
      {
        testID,
        onPress: () =>
          onError({ nativeEvent: { description: "network error" } }),
        onMessage,
      },
      "Mock WebView",
    );
  },
}));

describe("WebShellScreen", () => {
  it("WebView 로드 완료 시 네이티브 스플래시를 숨긴다", async () => {
    const SplashScreen = jest.requireMock("expo-splash-screen") as {
      hideAsync: jest.Mock;
    };

    render(<WebShellScreen />);

    await waitFor(() => {
      expect(SplashScreen.hideAsync).toHaveBeenCalled();
    });
  });

  it("에러 발생 시 다시 시도 버튼을 보여준다", async () => {
    render(<WebShellScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("webview-shell")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("webview-shell"));

    await waitFor(() => {
      expect(screen.getByText("다시 시도")).toBeTruthy();
    });
  });

  it("푸시 권한 요청 메시지를 받으면 권한 요청과 토큰 등록을 실행한다", async () => {
    const { requestPushPermissionAndRegister } = jest.requireMock(
      "../push-permission",
    ) as {
      requestPushPermissionAndRegister: jest.Mock;
    };

    render(<WebShellScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("webview-shell")).toBeTruthy();
    });

    fireEvent(screen.getByTestId("webview-shell"), "message", {
      nativeEvent: {
        data: JSON.stringify({ type: "REQUEST_PUSH_PERMISSION" }),
      },
    });

    await waitFor(() => {
      expect(requestPushPermissionAndRegister).toHaveBeenCalled();
    });
  });
});
