type OAuthCallbackData =
  | { kind: "code"; code: string }
  | { kind: "session"; accessToken: string; refreshToken: string }
  | { kind: "error"; paramKeys: string; error: string };

function getAllParams(url: URL) {
  const searchParams = new URLSearchParams(url.search);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);

  return {
    searchParams,
    hashParams,
  };
}

export function parseOAuthCallback(urlString: string): OAuthCallbackData {
  const url = new URL(urlString);
  const { searchParams, hashParams } = getAllParams(url);

  const code = searchParams.get("code") ?? hashParams.get("code");

  if (code) {
    return { kind: "code", code };
  }

  const accessToken =
    searchParams.get("access_token") ?? hashParams.get("access_token");
  const refreshToken =
    searchParams.get("refresh_token") ?? hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    return {
      kind: "session",
      accessToken,
      refreshToken,
    };
  }

  const mergedKeys = new Set([
    ...searchParams.keys(),
    ...hashParams.keys(),
  ]);

  return {
    kind: "error",
    paramKeys: [...mergedKeys].join(", ") || "none",
    error:
      searchParams.get("error_description") ??
      hashParams.get("error_description") ??
      searchParams.get("error") ??
      hashParams.get("error") ??
      "unknown",
  };
}
