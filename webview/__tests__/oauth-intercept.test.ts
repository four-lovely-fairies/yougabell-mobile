import { getInterceptedNativeOAuthProvider } from "../oauth-intercept";

const originalSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

describe("oauth intercept", () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL =
      "https://oaegkaiphyssvspcogll.supabase.co";
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  });

  it("intercepts Google authorize urls", () => {
    expect(
      getInterceptedNativeOAuthProvider(
        "https://oaegkaiphyssvspcogll.supabase.co/auth/v1/authorize?provider=google",
      ),
    ).toBe("google");
  });

  it("intercepts Apple authorize urls", () => {
    expect(
      getInterceptedNativeOAuthProvider(
        "https://oaegkaiphyssvspcogll.supabase.co/auth/v1/authorize?provider=apple",
      ),
    ).toBe("apple");
  });

  it("ignores non-supabase urls", () => {
    expect(
      getInterceptedNativeOAuthProvider(
        "https://accounts.google.com/o/oauth2/v2/auth",
      ),
    ).toBeNull();
  });
});
