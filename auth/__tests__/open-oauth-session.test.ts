import { openOAuthSession } from "../open-oauth-session";

const mockOpenAuthSessionAsync = jest.fn();
const mockAddEventListener = jest.fn();

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: (...args: unknown[]) =>
    mockOpenAuthSessionAsync(...args),
}));

jest.mock("expo-linking", () => ({
  addEventListener: (...args: unknown[]) => mockAddEventListener(...args),
}));

const REDIRECT_TO = "yougabell://auth/callback";
const AUTH_URL =
  "https://project.supabase.co/auth/v1/authorize?provider=google";

describe("openOAuthSession", () => {
  let removeSubscription: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    removeSubscription = jest.fn();
    mockAddEventListener.mockReturnValue({ remove: removeSubscription });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("iOS: WebBrowser가 success를 반환하면 그 URL을 쓴다", async () => {
    const successUrl = `${REDIRECT_TO}?code=ios-code`;
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: successUrl,
    });

    await expect(openOAuthSession(AUTH_URL, REDIRECT_TO)).resolves.toBe(
      successUrl,
    );
    expect(removeSubscription).toHaveBeenCalledTimes(1);
  });

  it("Android: dismiss여도 딥링크로 도착한 콜백 URL을 쓴다", async () => {
    const deepLinkUrl = `${REDIRECT_TO}?code=android-code`;
    let urlListener: (event: { url: string }) => void = () => {};
    mockAddEventListener.mockImplementation((_event: string, listener) => {
      urlListener = listener;
      return { remove: removeSubscription };
    });
    mockOpenAuthSessionAsync.mockImplementation(async () => {
      // 브라우저 dismiss 직전에 딥링크 콜백이 먼저 도착한 상황.
      urlListener({ url: deepLinkUrl });
      return { type: "dismiss" };
    });

    await expect(openOAuthSession(AUTH_URL, REDIRECT_TO)).resolves.toBe(
      deepLinkUrl,
    );
  });

  it("관련 없는 딥링크는 무시한다", async () => {
    let urlListener: (event: { url: string }) => void = () => {};
    mockAddEventListener.mockImplementation((_event: string, listener) => {
      urlListener = listener;
      return { remove: removeSubscription };
    });
    mockOpenAuthSessionAsync.mockImplementation(async () => {
      urlListener({ url: "yougabell://something-else?foo=bar" });
      return { type: "dismiss" };
    });

    const pending = openOAuthSession(AUTH_URL, REDIRECT_TO);
    await jest.runOnlyPendingTimersAsync();

    await expect(pending).resolves.toBeNull();
  });

  it("취소: dismiss + 딥링크 없음이면 null", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({ type: "cancel" });

    const pending = openOAuthSession(AUTH_URL, REDIRECT_TO);
    await jest.runOnlyPendingTimersAsync();

    await expect(pending).resolves.toBeNull();
    expect(removeSubscription).toHaveBeenCalledTimes(1);
  });
});
