export type ResolveWebviewUrlInput = {
  defaultUrl: string;
  isDev: boolean;
  overrideEnabled: boolean;
  overrideUrl?: string;
};

export function buildWebviewStartUrl(baseUrl: string, pathname: string) {
  const url = new URL(baseUrl);
  const normalizedPath = pathname === "/" ? "" : pathname;
  const basePath =
    url.pathname === "/"
      ? ""
      : url.pathname.endsWith("/")
        ? url.pathname.slice(0, -1)
        : url.pathname;

  url.pathname = `${basePath}${normalizedPath}` || "/";
  url.search = "";
  url.hash = "";

  return url.toString();
}

export function resolveWebviewUrl(input: ResolveWebviewUrlInput) {
  if (input.isDev && input.overrideEnabled && input.overrideUrl) {
    return input.overrideUrl;
  }

  return input.defaultUrl;
}
