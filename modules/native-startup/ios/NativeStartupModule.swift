import ExpoModulesCore
import Foundation

public class NativeStartupModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeStartup")

    AsyncFunction("getStartupTimingAsync") { () -> [String: Any]? in
      let defaults = UserDefaults.standard
      let startedUptime = defaults.double(forKey: "yougabell.nativeStartup.processStartedUptimeMs")
      let startedWall = defaults.double(forKey: "yougabell.nativeStartup.processStartedWallMs")
      guard startedUptime > 0, startedWall > 0 else {
        return nil
      }

      let nowUptime = ProcessInfo.processInfo.systemUptime * 1000
      let elapsed = max(0, nowUptime - startedUptime)
      return [
        "startedAtEpochMs": Date().timeIntervalSince1970 * 1000 - elapsed,
        "elapsedMs": elapsed,
        "clock": "ios_system_uptime"
      ]
    }
  }
}
