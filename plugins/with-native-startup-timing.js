const {
  withAppDelegate,
  withMainApplication,
} = require("@expo/config-plugins");

const ANDROID_MARKER = "// yougabell-native-startup-timing";
const IOS_MARKER = "// yougabell-native-startup-timing";

/**
 * Stores a process-start baseline before React Native starts. The local Expo
 * module reads this baseline later, after the WebView has rendered the home.
 */
module.exports = function withNativeStartupTiming(config) {
  config = withMainApplication(config, (nextConfig) => {
    let { contents } = nextConfig.modResults;
    if (contents.includes(ANDROID_MARKER)) return nextConfig;

    if (!contents.includes("import android.os.SystemClock")) {
      contents = contents.replace(
        "import android.content.res.Configuration",
        "import android.content.res.Configuration\nimport android.os.SystemClock",
      );
    }

    const onCreate = "  override fun onCreate() {";
    if (!contents.includes(onCreate)) {
      throw new Error("Could not find MainApplication.onCreate for startup timing");
    }
    contents = contents.replace(
      onCreate,
      `${onCreate}\n    ${ANDROID_MARKER}\n    getSharedPreferences(\"yougabell.nativeStartup\", MODE_PRIVATE)\n      .edit()\n      .putLong(\"process_started_elapsed_ms\", SystemClock.elapsedRealtime())\n      .putLong(\"process_started_wall_ms\", System.currentTimeMillis())\n      .apply()`,
    );
    nextConfig.modResults.contents = contents;
    return nextConfig;
  });

  return withAppDelegate(config, (nextConfig) => {
    let { contents } = nextConfig.modResults;
    if (contents.includes(IOS_MARKER)) return nextConfig;

    const didFinish = "  ) -> Bool {";
    if (!contents.includes(didFinish)) {
      throw new Error("Could not find AppDelegate.didFinishLaunching for startup timing");
    }
    contents = contents.replace(
      didFinish,
      `${didFinish}\n    ${IOS_MARKER}\n    UserDefaults.standard.set(ProcessInfo.processInfo.systemUptime * 1000, forKey: \"yougabell.nativeStartup.processStartedUptimeMs\")\n    UserDefaults.standard.set(Date().timeIntervalSince1970 * 1000, forKey: \"yougabell.nativeStartup.processStartedWallMs\")`,
    );
    nextConfig.modResults.contents = contents;
    return nextConfig;
  });
};
