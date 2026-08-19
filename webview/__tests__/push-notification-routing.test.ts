import { resolvePushNotificationPath } from "../push-notification-routing";

describe("resolvePushNotificationPath", () => {
  it("maps notification action data to web routes", () => {
    expect(resolvePushNotificationPath({ actionType: "open_mission" })).toBe(
      "/mission",
    );
    expect(resolvePushNotificationPath({ actionType: "open_report" })).toBe(
      "/weekly-report",
    );
    expect(resolvePushNotificationPath({ actionType: "open_roadmap" })).toBe(
      "/roadmap",
    );
    expect(resolvePushNotificationPath({ actionType: "open_chat" })).toBe(
      "/chat",
    );
    expect(resolvePushNotificationPath({ actionType: "open_home" })).toBe("/");
  });

  it("routes url notifications to the app-internal targetUrl", () => {
    expect(
      resolvePushNotificationPath({
        actionType: "url",
        targetUrl: "/settings/inquiries/abc-123",
      }),
    ).toBe("/settings/inquiries/abc-123");
  });

  it("rejects url notifications that would leave the app", () => {
    expect(
      resolvePushNotificationPath({
        actionType: "url",
        targetUrl: "https://evil.example.com",
      }),
    ).toBeNull();
    expect(
      resolvePushNotificationPath({
        actionType: "url",
        targetUrl: "//evil.example.com",
      }),
    ).toBeNull();
    expect(
      resolvePushNotificationPath({ actionType: "url", targetUrl: 42 }),
    ).toBeNull();
  });

  it("ignores unknown notification data", () => {
    expect(resolvePushNotificationPath({ actionType: "url" })).toBeNull();
    expect(resolvePushNotificationPath({})).toBeNull();
  });
});
