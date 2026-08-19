const PUSH_ACTION_ROUTES: Record<string, string> = {
  open_home: "/",
  open_mission: "/mission",
  open_roadmap: "/roadmap",
  open_chat: "/chat",
  open_report: "/weekly-report",
};

/**
 * `actionType: "url"` 알림은 고정 라우트가 없고 `targetUrl`로 목적지를 받는다.
 * (예: 문의 답변 알림 → `/settings/inquiries/{id}`)
 *
 * 값이 그대로 WebView 시작 경로가 되므로 **앱 내부 경로만** 통과시킨다.
 * 외부 URL이나 `//host` 형태의 프로토콜 상대 경로를 허용하면 조작된 푸시로
 * 임의 사이트를 앱 안에서 띄울 수 있다.
 */
function resolveTargetUrl(data: Record<string, unknown>): string | null {
  const targetUrl = data.targetUrl;
  if (typeof targetUrl !== "string") {
    return null;
  }
  if (!targetUrl.startsWith("/") || targetUrl.startsWith("//")) {
    return null;
  }
  return targetUrl;
}

export function resolvePushNotificationPath(
  data: Record<string, unknown>,
): string | null {
  const actionType = data.actionType;
  if (typeof actionType !== "string") {
    return null;
  }

  if (actionType === "url") {
    return resolveTargetUrl(data);
  }

  return PUSH_ACTION_ROUTES[actionType] ?? null;
}
