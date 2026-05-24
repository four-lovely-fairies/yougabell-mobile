type NativeOAuthProvider = "google" | "apple";

function getSupabaseAuthOrigin() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return null;
  }
}

export function getInterceptedNativeOAuthProvider(url: string) {
  const supabaseAuthOrigin = getSupabaseAuthOrigin();

  if (!supabaseAuthOrigin) {
    return null;
  }

  try {
    const targetUrl = new URL(url);

    if (targetUrl.origin !== supabaseAuthOrigin) {
      return null;
    }

    if (!targetUrl.pathname.endsWith("/auth/v1/authorize")) {
      return null;
    }

    const provider = targetUrl.searchParams.get("provider");

    if (provider === "google" || provider === "apple") {
      return provider satisfies NativeOAuthProvider;
    }

    return null;
  } catch {
    return null;
  }
}
