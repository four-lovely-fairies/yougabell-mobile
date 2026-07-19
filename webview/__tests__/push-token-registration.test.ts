import * as Crypto from "expo-crypto";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

import { getMobileSupabaseClient } from "../../auth/supabase-client";
import { registerExpoPushToken } from "../push-token-registration";

jest.mock("expo-constants", () => ({
  easConfig: { projectId: "project-1" },
  expoConfig: { extra: { eas: { projectId: "project-1" } } },
}));

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "device-1"),
}));

jest.mock("expo-notifications", () => ({
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: "ExponentPushToken[token-1]" }),
  ),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../auth/supabase-client", () => ({
  getMobileSupabaseClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: { session: { access_token: "access-token" } },
        }),
      ),
    },
  })),
}));

describe("registerExpoPushToken", () => {
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.yougabell.com";
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, status: 200 } as Response),
    );
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  });

  it("registers the Expo push token with the API", async () => {
    const result = await registerExpoPushToken();

    expect(result).toEqual({ registered: true, deviceId: "device-1" });
    expect(Crypto.randomUUID).toHaveBeenCalled();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "yougabell.push.deviceId",
      "device-1",
    );
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "project-1",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.yougabell.com/notifications/push-tokens",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId: "device-1",
          token: "ExponentPushToken[token-1]",
          platform: "ios",
        }),
      },
    );
  });

  it("skips registration when there is no native session", async () => {
    (getMobileSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      },
    });

    const result = await registerExpoPushToken();

    expect(result).toEqual({ registered: false, reason: "missing_session" });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
