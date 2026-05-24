import { describe, expect, it } from "@jest/globals";

import { resolveWebviewUrl } from "../webview-source";

describe("resolveWebviewUrl", () => {
  it("개발 오버라이드가 켜진 development build에서는 override URL을 우선 사용한다", () => {
    const result = resolveWebviewUrl({
      defaultUrl: "https://web.yougabell.com",
      isDev: true,
      overrideEnabled: true,
      overrideUrl: "http://10.0.2.2:3000",
    });

    expect(result).toBe("http://10.0.2.2:3000");
  });

  it("development build에서도 오버라이드가 꺼져 있으면 기본 URL을 사용한다", () => {
    const result = resolveWebviewUrl({
      defaultUrl: "https://web.yougabell.com",
      isDev: true,
      overrideEnabled: false,
      overrideUrl: "http://10.0.2.2:3000",
    });

    expect(result).toBe("https://web.yougabell.com");
  });

  it("production 성격에서는 오버라이드가 켜져 있어도 기본 URL을 사용한다", () => {
    const result = resolveWebviewUrl({
      defaultUrl: "https://web.yougabell.com",
      isDev: false,
      overrideEnabled: true,
      overrideUrl: "http://10.0.2.2:3000",
    });

    expect(result).toBe("https://web.yougabell.com");
  });
});
