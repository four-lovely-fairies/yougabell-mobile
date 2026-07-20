const PUSH_ACTION_ROUTES: Record<string, string> = {
  open_home: "/",
  open_mission: "/mission",
  open_roadmap: "/roadmap",
  open_chat: "/chat",
  open_report: "/weekly-report",
};

export function resolvePushNotificationPath(
  data: Record<string, unknown>,
): string | null {
  const actionType = data.actionType;
  if (typeof actionType !== "string") {
    return null;
  }

  return PUSH_ACTION_ROUTES[actionType] ?? null;
}
