import * as Notifications from "expo-notifications";
import { PermissionsAndroid, Platform } from "react-native";

export type PushPermissionResult = "granted" | "denied";

async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "기본 알림",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function getPushPermissionStatus(): Promise<PushPermissionResult> {
  await ensureAndroidChannel();
  if (Platform.OS === "android") {
    if (Platform.Version < 33) {
      return "granted";
    }

    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return granted ? "granted" : "denied";
  }

  const current = await Notifications.getPermissionsAsync();
  return current.status === "granted" ? "granted" : "denied";
}

export async function requestPushPermission(): Promise<PushPermissionResult> {
  await ensureAndroidChannel();
  if (Platform.OS === "android") {
    if (Platform.Version < 33) {
      return "granted";
    }

    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (granted) {
      return "granted";
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED
      ? "granted"
      : "denied";
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status === "undetermined") {
    const next = await Notifications.requestPermissionsAsync();
    status = next.status;
  }

  return status === "granted" ? "granted" : "denied";
}
