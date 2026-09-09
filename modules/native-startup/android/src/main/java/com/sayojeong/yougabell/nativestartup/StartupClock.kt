package com.sayojeong.yougabell.nativestartup
import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.os.SystemClock

// Process memory only; callbacks and finish run on the main thread.
object StartupClock {
  private var started: Long? = null
  private var consumed = false
  private var interrupted = false
  @JvmStatic fun start(application: Application) {
    if (started != null) return
    started = SystemClock.elapsedRealtime()
    application.registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
      override fun onActivityStopped(activity: Activity) { interrupted = true }
      override fun onActivityCreated(activity: Activity, state: Bundle?) {}
      override fun onActivityStarted(activity: Activity) {}
      override fun onActivityResumed(activity: Activity) {}
      override fun onActivityPaused(activity: Activity) {}
      override fun onActivitySaveInstanceState(activity: Activity, state: Bundle) {}
      override fun onActivityDestroyed(activity: Activity) {}
    })
  }
  fun finish(activity: Activity?): Map<String, Any> {
    val begin = started ?: return mapOf("reason" to "missing_native_start")
    if (consumed) return mapOf("reason" to "already_completed")
    consumed = true
    if (interrupted) return mapOf("reason" to "background_interrupted")
    if (activity == null || !activity.hasWindowFocus()) return mapOf("reason" to "not_foreground")
    val duration = (SystemClock.elapsedRealtime() - begin).toDouble()
    activity.reportFullyDrawn()
    return mapOf(
      "duration_ms" to duration,
      "clock" to "android_elapsed_realtime",
      "start_point" to "application_on_create",
      "endpoint" to "native_home_ready_received",
      "launch_type" to "initial_process_launch"
    )
  }
}
