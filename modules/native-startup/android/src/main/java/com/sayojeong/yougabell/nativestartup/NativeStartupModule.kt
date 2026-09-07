package com.sayojeong.yougabell.nativestartup

import android.content.Context
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeStartupModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeStartup")

    AsyncFunction("getStartupTimingAsync") {
      val context = appContext.reactContext ?: return@AsyncFunction null
      val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
      val startedElapsed = preferences.getLong(PROCESS_STARTED_ELAPSED_MS, -1)
      val startedWall = preferences.getLong(PROCESS_STARTED_WALL_MS, -1)
      if (startedElapsed < 0 || startedWall < 0) return@AsyncFunction null

      val elapsed = (SystemClock.elapsedRealtime() - startedElapsed).coerceAtLeast(0)
      mapOf(
        "startedAtEpochMs" to (System.currentTimeMillis() - elapsed).toDouble(),
        "elapsedMs" to elapsed.toDouble(),
        "clock" to "android_elapsed_realtime"
      )
    }
  }

  private companion object {
    const val PREFERENCES = "yougabell.nativeStartup"
    const val PROCESS_STARTED_ELAPSED_MS = "process_started_elapsed_ms"
    const val PROCESS_STARTED_WALL_MS = "process_started_wall_ms"
  }
}
