// 메인 진입점 — WebView 컨테이너.
// docs/features/20260508-onboarding.md §4.3 참조.

import Constants from "expo-constants";
import { useCallback, useEffect, useRef } from "react";
import { BackHandler, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import { handleWebMessage, parseMessage } from "@/webview/handle-message";

const WEB_URL =
  (Constants.expoConfig?.extra as { webUrl?: string } | undefined)?.webUrl ??
  process.env.EXPO_PUBLIC_WEB_URL ??
  "https://yougabell-web.vercel.app";

// web이 native 환경을 감지해 postMessage를 활성화하기 위한 플래그.
const INJECT_NATIVE_FLAG = `
  window.__YOUGABELL_NATIVE__ = true;
  true; // injectedJavaScript는 반환값을 요구
`;

export default function HomeScreen() {
  const ref = useRef<WebView>(null);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const msg = parseMessage(event.nativeEvent.data);
    if (!msg) return;
    void handleWebMessage(msg);
  }, []);

  // Android 하드웨어 back — WebView history pop. iOS는 swipe gesture로 처리.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      ref.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView style={styles.flex} edges={["top", "left", "right"]}>
      <WebView
        ref={ref}
        source={{ uri: WEB_URL }}
        style={styles.flex}
        onMessage={onMessage}
        injectedJavaScriptBeforeContentLoaded={INJECT_NATIVE_FLAG}
        sharedCookiesEnabled // iOS: Supabase 세션 쿠키 공유
        thirdPartyCookiesEnabled // Android
        javaScriptEnabled
        domStorageEnabled // localStorage (온보딩 draft 영속)
        allowsBackForwardNavigationGestures // iOS 뒤로 가기 제스처
        startInLoadingState
        decelerationRate="normal"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
