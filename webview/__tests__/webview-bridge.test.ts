import {
  buildNativeMessageScript,
  buildSessionSyncMessage,
  buildWebViewBootstrapScript,
  parseWebToNativeMessage,
} from "../webview-bridge";

describe("webview bridge helpers", () => {
  it("parses a native google sign-in request", () => {
    expect(
      parseWebToNativeMessage(
        JSON.stringify({ type: "REQUEST_NATIVE_GOOGLE_SIGN_IN" }),
      ),
    ).toEqual({ type: "REQUEST_NATIVE_GOOGLE_SIGN_IN" });
  });

  it("rejects malformed onboarding messages", () => {
    expect(
      parseWebToNativeMessage(
        JSON.stringify({
          type: "ONBOARDING_COMPLETE",
          payload: { userId: 1 },
        }),
      ),
    ).toBeNull();
  });

  it("includes the native bootstrap flag", () => {
    expect(buildWebViewBootstrapScript()).toContain("__YOUGABELL_NATIVE__");
  });

  it("builds a dispatch script for session sync", () => {
    const script = buildNativeMessageScript(
      buildSessionSyncMessage({
        access_token: "access-token",
        refresh_token: "refresh-token",
      } as never),
    );

    expect(script).toContain("SUPABASE_SESSION_SYNC");
    expect(script).toContain("access-token");
    expect(script).toContain("refresh-token");
  });
});
