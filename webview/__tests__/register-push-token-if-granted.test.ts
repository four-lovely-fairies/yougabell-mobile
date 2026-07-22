import * as Notifications from "expo-notifications";

import { registerPushTokenIfGranted } from "../push-permission";
import { registerExpoPushToken } from "../push-token-registration";

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("../push-token-registration", () => ({
  registerExpoPushToken: jest.fn(() =>
    Promise.resolve({ registered: true, deviceId: "device-1" }),
  ),
}));

describe("registerPushTokenIfGranted", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers the token when OS permission is already granted", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });

    await registerPushTokenIfGranted();

    expect(registerExpoPushToken).toHaveBeenCalledTimes(1);
  });

  it("does not register (or prompt) when permission is not granted", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

    await registerPushTokenIfGranted();

    expect(registerExpoPushToken).not.toHaveBeenCalled();
  });

  it("swallows registration errors silently", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (registerExpoPushToken as jest.Mock).mockRejectedValueOnce(
      new Error("network"),
    );

    await expect(registerPushTokenIfGranted()).resolves.toBeUndefined();
  });
});
