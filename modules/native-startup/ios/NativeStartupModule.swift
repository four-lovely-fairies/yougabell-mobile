import ExpoModulesCore
import UIKit
import os

public enum StartupClock {
  private static var started: Double?
  private static var consumed = false
  private static var interrupted = false
  private static var observer: NSObjectProtocol?
  private static let log = OSLog(subsystem: "com.sayojeong.yougabell", category: "Startup")

  public static func start(_ application: UIApplication) {
    guard started == nil else { return }
    started = ProcessInfo.processInfo.systemUptime
    interrupted = application.applicationState == .background
    os_signpost(.begin, log: log, name: "NativeHomeReady")
    observer = NotificationCenter.default.addObserver(
      forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main
    ) { _ in interrupted = true }
  }
  static func finish() -> [String: Any] {
    guard let begin = started else { return ["reason": "missing_native_start"] }
    guard !consumed else { return ["reason": "already_completed"] }
    consumed = true
    os_signpost(.end, log: log, name: "NativeHomeReady")
    guard !interrupted else { return ["reason": "background_interrupted"] }
    guard UIApplication.shared.applicationState == .active else { return ["reason": "not_foreground"] }
    return [
      "duration_ms": (ProcessInfo.processInfo.systemUptime - begin) * 1000,
      "clock": "ios_system_uptime",
      "start_point": "app_delegate_did_finish_launching",
      "endpoint": "native_home_ready_received",
      "launch_type": "initial_process_launch"
    ]
  }
}
public class NativeStartupModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeStartup")
    AsyncFunction("finishHomeAsync") { () -> [String: Any] in
      StartupClock.finish()
    }.runOnQueue(.main)
  }
}
