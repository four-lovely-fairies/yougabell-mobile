import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { WebShellScreen } from "../web-shell-screen";

jest.mock("../use-webview-source", () => ({
  useWebviewSource: () => ({
    uri: "https://web.yougabell.com",
  }),
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
