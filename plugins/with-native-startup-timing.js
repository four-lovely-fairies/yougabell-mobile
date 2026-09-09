const {
  withAppDelegate,
  withMainApplication,
} = require("@expo/config-plugins");
function insert(contents, anchor, addition) {
  if (contents.includes(addition)) return contents;
  if (contents.split(anchor).length !== 2)
    throw new Error("Startup timing anchor missing or ambiguous: " + anchor);
  return contents.replace(anchor, anchor + addition);
}
module.exports = function withNativeStartupTiming(config) {
  config = withMainApplication(config, (mod) => {
    mod.modResults.contents = insert(
      mod.modResults.contents,
      "  override fun onCreate() {",
      "\n    com.sayojeong.yougabell.nativestartup.StartupClock.start(this)",
    );
    return mod;
  });
  return withAppDelegate(config, (mod) => {
    let contents = insert(
      mod.modResults.contents,
      "import Expo",
      "\nimport NativeStartup",
    );
    const match = contents.match(
      /didFinishLaunchingWithOptions[^]*?\) -> Bool \{/,
    );
    if (!match) throw new Error("Swift didFinishLaunching missing");
    mod.modResults.contents = insert(
      contents,
      match[0],
      "\n    StartupClock.start(application)",
    );
    return mod;
  });
};
