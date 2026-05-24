import type { Session } from "@supabase/supabase-js";

export const NATIVE_WEBVIEW_EVENT_NAME = "yougabell-native-message";

export type WebToNativeMessage =
  | { type: "WEB_READY" }
  | { type: "REQUEST_NATIVE_GOOGLE_SIGN_IN" }
  | { type: "REQUEST_NATIVE_APPLE_SIGN_IN" }
  | { type: "REQUEST_PUSH_PERMISSION" }
  | { type: "ONBOARDING_COMPLETE"; payload: { userId: string } }
  | { type: "LOGOUT" };

export type NativeToWebMessage =
  | {
      type: "SUPABASE_SESSION_SYNC";
      payload: { accessToken: string; refreshToken: string };
    }
  | { type: "SUPABASE_SESSION_CLEARED" }
  | { type: "NATIVE_GOOGLE_SIGN_IN_CANCELLED" }
  | { type: "NATIVE_GOOGLE_SIGN_IN_ERROR"; payload: { message: string } }
  | { type: "NATIVE_APPLE_SIGN_IN_CANCELLED" }
  | { type: "NATIVE_APPLE_SIGN_IN_ERROR"; payload: { message: string } };

export function buildWebViewBootstrapScript() {
  return "window.__YOUGABELL_NATIVE__ = true; true;";
}

export function parseWebToNativeMessage(rawMessage: string): WebToNativeMessage | null {
  try {
    const parsed = JSON.parse(rawMessage) as Partial<WebToNativeMessage> | null;

    if (!parsed || typeof parsed.type !== "string") {
      return null;
    }

    switch (parsed.type) {
      case "WEB_READY":
      case "REQUEST_NATIVE_GOOGLE_SIGN_IN":
      case "REQUEST_NATIVE_APPLE_SIGN_IN":
      case "REQUEST_PUSH_PERMISSION":
      case "LOGOUT":
        return parsed as WebToNativeMessage;
      case "ONBOARDING_COMPLETE":
        if (
          parsed.payload &&
          typeof parsed.payload === "object" &&
          typeof parsed.payload.userId === "string"
        ) {
          return parsed as WebToNativeMessage;
        }
        return null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function buildNativeMessageScript(message: NativeToWebMessage) {
  const encodedMessage = JSON.stringify(message);

  return `
    window.__YOUGABELL_NATIVE__ = true;
    window.dispatchEvent(
      new CustomEvent(${JSON.stringify(NATIVE_WEBVIEW_EVENT_NAME)}, {
        detail: ${encodedMessage},
      }),
    );
    true;
  `;
}

export function buildSessionSyncMessage(session: Session): NativeToWebMessage {
  return {
    type: "SUPABASE_SESSION_SYNC",
    payload: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    },
  };
}
