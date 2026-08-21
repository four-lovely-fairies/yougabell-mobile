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

  it("parses a native apple sign-in request", () => {
    expect(
      parseWebToNativeMessage(
        JSON.stringify({ type: "REQUEST_NATIVE_APPLE_SIGN_IN" }),
      ),
    ).toEqual({ type: "REQUEST_NATIVE_APPLE_SIGN_IN" });
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

  it("builds a dispatch script for push permission result", () => {
    const script = buildNativeMessageScript({
      type: "NATIVE_PUSH_PERMISSION_RESULT",
      payload: { permission: "denied" },
    });

    expect(script).toContain("NATIVE_PUSH_PERMISSION_RESULT");
    expect(script).toContain("denied");
  });

  it("parses a push permission status request", () => {
    expect(
      parseWebToNativeMessage(
        JSON.stringify({ type: "REQUEST_PUSH_PERMISSION_STATUS" }),
      ),
    ).toEqual({ type: "REQUEST_PUSH_PERMISSION_STATUS" });
  });

  it("builds an undetermined push permission status response", () => {
    const script = buildNativeMessageScript({
      type: "NATIVE_PUSH_PERMISSION_STATUS",
      payload: { permission: "undetermined" },
    });

    expect(script).toContain("NATIVE_PUSH_PERMISSION_STATUS");
    expect(script).toContain("undetermined");
  });
});
