import * as Notifications from "expo-notifications";
import { PermissionsAndroid, Platform } from "react-native";
import { registerExpoPushToken } from "./push-token-registration";

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
    return result === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied";
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status === "undetermined") {
    const next = await Notifications.requestPermissionsAsync();
    status = next.status;
  }

  return status === "granted" ? "granted" : "denied";
}

export async function requestPushPermissionAndRegister(): Promise<PushPermissionResult> {
  const permission = await requestPushPermission();
  if (permission !== "granted") {
    return permission;
  }

  try {
    await registerExpoPushToken();
  } catch {
    // 권한 허용 자체는 유지한다. 토큰 등록 실패는 다음 토글/앱 실행에서 재시도 가능하다.
  }

  return permission;
}

/**
 * OS 권한이 이미 허용된 경우에만 토큰을 조용히 (재)등록한다. 프롬프트를 띄우지 않는다.
 * 앱 실행·로그인 시 호출해 과거 온보딩 사용자, 토큰 로테이션, 재설치를 커버한다
 * (온보딩에서만 등록되던 구조 보완 — 재로그인 강제 없이 자동 저장).
 */
export async function registerPushTokenIfGranted(): Promise<void> {
  try {
    const status = await getPushPermissionStatus();
    if (status !== "granted") {
      return;
    }
    await registerExpoPushToken();
  } catch {
    // 조용히 무시 — 다음 실행 기회에 재시도된다.
  }
}
