import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { WebShellScreen } from "../web-shell-screen";

jest.mock("../use-webview-source", () => ({
  useWebviewSource: () => ({
    uri: "https://web.yougabell.com",
  }),
}));

jest.mock("../../auth/google-sign-in", () => ({
  signInWithGoogleInBrowser: jest.fn(),
  NativeGoogleSignInCancelledError: class NativeGoogleSignInCancelledError extends Error {},
  NativeGoogleSignInError: class NativeGoogleSignInError extends Error {},
}));

jest.mock("../../auth/apple-sign-in", () => ({
  signInWithApple: jest.fn(),
  NativeAppleSignInCancelledError: class NativeAppleSignInCancelledError extends Error {},
  NativeAppleSignInError: class NativeAppleSignInError extends Error {},
}));

jest.mock("../../auth/supabase-client", () => ({
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
}));

jest.mock("react-native-webview", () => ({
  WebView: ({
    onError,
    testID,
  }: {
    onError: (event: unknown) => void;
    testID: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require("react");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require("react-native");

    return React.createElement(
      Text,
      {
        testID,
        onPress: () =>
          onError({ nativeEvent: { description: "network error" } }),
      },
      "Mock WebView",
    );
  },
}));

describe("WebShellScreen", () => {
  it("초기에는 로딩 문구를 보여준다", () => {
    render(<WebShellScreen />);

    expect(screen.getByText("육아밸을 불러오는 중이에요")).toBeTruthy();
  });

  it("에러 발생 시 다시 시도 버튼을 보여준다", () => {
    render(<WebShellScreen />);

    fireEvent.press(screen.getByTestId("webview-shell"));

    expect(screen.getByText("다시 시도")).toBeTruthy();
  });
});
