import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

// web ↔ mobile postMessage 프로토콜 (docs/features/20260508-onboarding.md §4.3)
export type NativeMessage =
  | { type: "ONBOARDING_COMPLETE"; payload: { userId: string } }
  | { type: "REQUEST_PUSH_PERMISSION" }
  | { type: "LOGOUT" };

export function parseMessage(raw: string): NativeMessage | null {
  try {
    const parsed = JSON.parse(raw) as { type?: unknown };
    if (typeof parsed.type !== "string") return null;
    return parsed as NativeMessage;
  } catch {
    return null;
  }
}

export async function handleWebMessage(msg: NativeMessage): Promise<void> {
  switch (msg.type) {
    case "ONBOARDING_COMPLETE":
    case "REQUEST_PUSH_PERMISSION":
      await requestPushPermission();
      return;
    case "LOGOUT":
      await SecureStore.deleteItemAsync("expo_push_token");
      return;
  }
}

export async function requestPushPermission(): Promise<{
  granted: boolean;
  token: string | null;
}> {
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status === "undetermined") {
    const next = await Notifications.requestPermissionsAsync();
    status = next.status;
  }

  if (status !== "granted") return { granted: false, token: null };

  // TODO(push): 서버에 토큰 등록 (별도 endpoint, 본 기획 외)
  // const { data: token } = await Notifications.getExpoPushTokenAsync();
  // await api.registerPushToken(token);
  return { granted: true, token: null };
}
