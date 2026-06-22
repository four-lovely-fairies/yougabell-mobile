import { devWebConfig } from "./dev-web-config";
import { buildWebviewStartUrl, resolveWebviewUrl } from "./webview-source";

export function useWebviewSource(pathname = "/mobile-entry") {
  const defaultUrl = process.env.EXPO_PUBLIC_WEB_URL ?? "";
  const baseUrl = resolveWebviewUrl({
    defaultUrl,
    isDev: __DEV__,
    overrideEnabled: devWebConfig.enabled,
    overrideUrl: devWebConfig.url,
  });

  return {
    uri: buildWebviewStartUrl(baseUrl, pathname),
  };
}
