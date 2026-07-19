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

  it("ignores unknown notification data", () => {
    expect(resolvePushNotificationPath({ actionType: "url" })).toBeNull();
    expect(resolvePushNotificationPath({})).toBeNull();
  });
});
