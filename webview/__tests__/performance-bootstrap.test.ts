import { buildWebViewBootstrapScript } from "../webview-bridge";

describe("performance bootstrap", () => {
  it("keeps the existing no-metadata contract", () => {
    expect(buildWebViewBootstrapScript()).toBe(
      "window.__YOUGABELL_NATIVE__ = true; true;",
    );
  });
  it("injects technical metadata and safely escapes script delimiters", () => {
    const script = buildWebViewBootstrapScript({
      launchId: "launch-1",
      startedAt: 123,
      appVersion: "1.1.2",
      appRelease: "</script>",
      platform: "ios",
      entryPath: "/mobile-entry",
      sessionLookupMs: 20,
    });
    expect(script).toContain("__YOUGABELL_PERFORMANCE__");
    expect(script).toContain('"launchId":"launch-1"');
    expect(script).not.toContain("</script>");
    expect(script).not.toContain("accessToken");
  });
});
