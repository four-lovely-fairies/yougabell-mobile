export type ResolveWebviewUrlInput = {
  defaultUrl: string;
  isDev: boolean;
  overrideEnabled: boolean;
  overrideUrl?: string;
};

export function resolveWebviewUrl(input: ResolveWebviewUrlInput) {
  if (input.isDev && input.overrideEnabled && input.overrideUrl) {
    return input.overrideUrl;
  }

  return input.defaultUrl;
}
