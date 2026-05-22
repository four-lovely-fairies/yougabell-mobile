import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { useWebviewSource } from "./use-webview-source";
import { webShellStyles as styles } from "./web-shell-styles";

type WebShellPhase = "loading" | "ready" | "error";

export function WebShellScreen() {
  const source = useWebviewSource();
  const [phase, setPhase] = useState<WebShellPhase>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const handleRetry = () => {
    setPhase("loading");
    setReloadKey((current) => current + 1);
  };

  return (
    <View style={styles.container}>
      <WebView
        key={reloadKey}
        testID="webview-shell"
        source={source}
        style={styles.webview}
        onLoadEnd={() => setPhase("ready")}
        onError={() => setPhase("error")}
      />

      {phase === "loading" ? (
        <View pointerEvents="none" style={styles.overlay}>
          <Text style={styles.title}>육아밸을 불러오는 중이에요</Text>
          <Text style={styles.body}>앱 안에서 웹 화면을 준비하고 있어요.</Text>
        </View>
      ) : null}

      {phase === "error" ? (
        <View style={styles.overlay}>
          <Text style={styles.title}>화면을 불러오지 못했어요</Text>
          <Text style={styles.body}>
            네트워크 상태를 확인한 뒤 다시 시도해 주세요.
          </Text>
          <Pressable onPress={handleRetry} style={styles.button}>
            <Text style={styles.buttonLabel}>다시 시도</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
