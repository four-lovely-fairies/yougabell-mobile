import { parseWebToNativeMessage } from "../webview-bridge";

test("home readiness requires the launch correlation identifier", () => {
  expect(
    parseWebToNativeMessage(JSON.stringify({ type: "PERFORMANCE_HOME_READY" })),
  ).toBeNull();
  expect(
    parseWebToNativeMessage(
      JSON.stringify({
        type: "PERFORMANCE_HOME_READY",
        payload: { launchId: 123 },
      }),
    ),
  ).toBeNull();
  expect(
    parseWebToNativeMessage(
      JSON.stringify({
        type: "PERFORMANCE_HOME_READY",
        payload: { launchId: "launch-1" },
      }),
    ),
  ).toEqual({
    type: "PERFORMANCE_HOME_READY",
    payload: { launchId: "launch-1" },
  });
});
