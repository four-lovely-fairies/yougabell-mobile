import { requireOptionalNativeModule } from "expo-modules-core";
type StartupResult = Record<string, string | number>;
const nativeStartup = requireOptionalNativeModule<{
  finishHomeAsync(): Promise<StartupResult>;
}>("NativeStartup");
export async function finishNativeHome(): Promise<StartupResult> {
  try {
    return (
      (await nativeStartup?.finishHomeAsync()) ?? {
        reason: "native_module_unavailable",
      }
    );
  } catch {
    return { reason: "native_module_error" };
  }
}
