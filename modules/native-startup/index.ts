import { requireNativeModule } from "expo-modules-core";

export type NativeStartupTiming = {
  /** Wall-clock estimate of the native process launch. */
  startedAtEpochMs: number;
  /** Monotonic-clock duration from native process launch until this call. */
  elapsedMs: number;
  clock: "android_elapsed_realtime" | "ios_system_uptime";
};

type NativeStartupModule = {
  getStartupTimingAsync(): Promise<NativeStartupTiming | null>;
};

let nativeModule: NativeStartupModule | null = null;

try {
  nativeModule = requireNativeModule<NativeStartupModule>("NativeStartup");
} catch {
  // Expo Go and web do not contain the app-specific native module.
}

export async function getNativeStartupTiming(): Promise<NativeStartupTiming | null> {
  try {
    return (await nativeModule?.getStartupTimingAsync()) ?? null;
  } catch {
    return null;
  }
}
