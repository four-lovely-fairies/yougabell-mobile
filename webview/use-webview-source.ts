import { devWebConfig } from "./dev-web-config";
import { resolveWebviewUrl } from "./webview-source";

export function useWebviewSource() {
  const defaultUrl = process.env.EXPO_PUBLIC_WEB_URL ?? "";

  return {
    uri: resolveWebviewUrl({
      defaultUrl,
      isDev: __DEV__,
      overrideEnabled: devWebConfig.enabled,
      overrideUrl: devWebConfig.url,
    }),
  };
}
