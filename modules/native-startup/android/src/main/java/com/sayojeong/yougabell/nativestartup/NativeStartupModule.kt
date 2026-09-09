package com.sayojeong.yougabell.nativestartup
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues

class NativeStartupModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeStartup")
    AsyncFunction("finishHomeAsync") {
      StartupClock.finish(appContext.currentActivity)
    }.runOnQueue(Queues.MAIN)
  }
}
