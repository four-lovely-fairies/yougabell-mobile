import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import type { WebViewMessageEvent } from "react-native-webview";
import { WebView } from "react-native-webview";

import {
  NativeAppleSignInCancelledError,
  NativeAppleSignInError,
  signInWithApple,
} from "../auth/apple-sign-in";
import {
  NativeGoogleSignInCancelledError,
  NativeGoogleSignInError,
  signInWithGoogleInBrowser,
} from "../auth/google-sign-in";
import {
  getMobileSupabaseClient,
  getMobileSupabaseConfigError,
} from "../auth/supabase-client";

import {
  getPushPermissionStatus,
  requestPushPermission,
} from "./push-permission";
import { useWebviewSource } from "./use-webview-source";
import {
  buildNativeMessageScript,
  buildSessionSyncMessage,
  buildWebViewBootstrapScript,
  parseWebToNativeMessage,
} from "./webview-bridge";
import { webShellStyles as styles } from "./web-shell-styles";

type WebShellPhase = "loading" | "ready" | "error";

export function WebShellScreen() {
  const source = useWebviewSource();
  const [phase, setPhase] = useState<WebShellPhase>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const configError = getMobileSupabaseConfigError();

  const handleRetry = () => {
    setPhase("loading");
    setReloadKey((current) => current + 1);
  };

  async function syncSessionToWebView() {
    const { data } = await getMobileSupabaseClient().auth.getSession();

    if (!webViewRef.current) return;

    if (!data.session) {
      webViewRef.current.injectJavaScript(
        buildNativeMessageScript({ type: "SUPABASE_SESSION_CLEARED" }),
      );
      return;
    }

    webViewRef.current.injectJavaScript(
      buildNativeMessageScript(buildSessionSyncMessage(data.session)),
    );
  }

  useEffect(() => {
    if (configError) {
      return;
    }

    const {
      data: { subscription },
    } = getMobileSupabaseClient().auth.onAuthStateChange(() => {
      void syncSessionToWebView();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configError]);

  const handleWebMessage = async (event: WebViewMessageEvent) => {
    const message = parseWebToNativeMessage(event.nativeEvent.data);

    if (!message) return;

    switch (message.type) {
      case "WEB_READY":
        await syncSessionToWebView();
        return;
      case "REQUEST_NATIVE_GOOGLE_SIGN_IN":
        try {
          await signInWithGoogleInBrowser();
          await syncSessionToWebView();
        } catch (error) {
          if (error instanceof NativeGoogleSignInCancelledError) {
            webViewRef.current?.injectJavaScript(
              buildNativeMessageScript({
                type: "NATIVE_GOOGLE_SIGN_IN_CANCELLED",
              }),
            );
            return;
          }

          const messageText =
            error instanceof NativeGoogleSignInError
              ? error.message
              : "Google 로그인에 실패했습니다. 다시 시도해 주세요.";

          webViewRef.current?.injectJavaScript(
            buildNativeMessageScript({
              type: "NATIVE_GOOGLE_SIGN_IN_ERROR",
              payload: { message: messageText },
            }),
          );
        }
        return;
      case "REQUEST_NATIVE_APPLE_SIGN_IN":
        try {
          await signInWithApple();
          await syncSessionToWebView();
        } catch (error) {
          if (error instanceof NativeAppleSignInCancelledError) {
            webViewRef.current?.injectJavaScript(
              buildNativeMessageScript({
                type: "NATIVE_APPLE_SIGN_IN_CANCELLED",
              }),
            );
            return;
          }

          const messageText =
            error instanceof NativeAppleSignInError
              ? error.message
              : "Apple 로그인에 실패했습니다. 다시 시도해 주세요.";

          webViewRef.current?.injectJavaScript(
            buildNativeMessageScript({
              type: "NATIVE_APPLE_SIGN_IN_ERROR",
              payload: { message: messageText },
            }),
          );
        }
        return;
      case "LOGOUT":
        await getMobileSupabaseClient().auth.signOut();
        return;
      case "REQUEST_PUSH_PERMISSION":
        try {
          const permission = await requestPushPermission();
          webViewRef.current?.injectJavaScript(
            buildNativeMessageScript({
              type: "NATIVE_PUSH_PERMISSION_RESULT",
              payload: { permission },
            }),
          );
        } catch {
          webViewRef.current?.injectJavaScript(
            buildNativeMessageScript({
              type: "NATIVE_PUSH_PERMISSION_RESULT",
              payload: { permission: "denied" },
            }),
          );
        }
        return;
      case "REQUEST_PUSH_PERMISSION_STATUS":
        try {
          const permission = await getPushPermissionStatus();
          webViewRef.current?.injectJavaScript(
            buildNativeMessageScript({
              type: "NATIVE_PUSH_PERMISSION_STATUS",
              payload: { permission },
            }),
          );
        } catch {
          webViewRef.current?.injectJavaScript(
            buildNativeMessageScript({
              type: "NATIVE_PUSH_PERMISSION_STATUS",
              payload: { permission: "denied" },
            }),
          );
        }
        return;
      case "OPEN_SYSTEM_NOTIFICATION_SETTINGS":
        await Linking.openSettings();
        return;
      case "ONBOARDING_COMPLETE":
        return;
      default:
        return;
    }
  };

  if (configError) {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.title}>앱 설정을 불러오지 못했어요</Text>
          <Text style={styles.body}>{configError}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        key={reloadKey}
        ref={webViewRef}
        testID="webview-shell"
        source={source}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={buildWebViewBootstrapScript()}
        onLoadEnd={() => setPhase("ready")}
        onError={() => setPhase("error")}
        onMessage={(event) => {
          void handleWebMessage(event);
        }}
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
