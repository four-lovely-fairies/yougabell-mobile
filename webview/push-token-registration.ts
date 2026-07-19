import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { getMobileSupabaseClient } from "../auth/supabase-client";

const DEVICE_ID_STORAGE_KEY = "yougabell.push.deviceId";

type PushRegistrationResult =
  | { registered: true; deviceId: string }
  | {
      registered: false;
      reason: "missing_session" | "missing_project_id" | "api_error";
    };

export async function registerExpoPushToken(): Promise<PushRegistrationResult> {
  const {
    data: { session },
  } = await getMobileSupabaseClient().auth.getSession();

  if (!session) {
    return { registered: false, reason: "missing_session" };
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    return { registered: false, reason: "missing_project_id" };
  }

  const deviceId = await getOrCreateDeviceId();
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const response = await fetch(`${getApiBaseUrl()}/notifications/push-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceId,
      token: token.data,
      platform: getPushPlatform(),
    }),
  });

  if (!response.ok) {
    return { registered: false, reason: "api_error" };
  }

  return { registered: true, deviceId };
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_STORAGE_KEY, next);
  return next;
}

function getExpoProjectId(): string | null {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
      ?.projectId ??
    null
  );
}

function getApiBaseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ??
    "http://localhost:3001"
  );
}

function getPushPlatform() {
  return Platform.OS === "android" ? "android" : "ios";
}
