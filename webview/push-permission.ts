import * as Notifications from "expo-notifications";

export type PushPermissionResult = "granted" | "denied";

export async function requestPushPermission(): Promise<PushPermissionResult> {
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status === "undetermined") {
    const next = await Notifications.requestPermissionsAsync();
    status = next.status;
  }

  return status === "granted" ? "granted" : "denied";
}
