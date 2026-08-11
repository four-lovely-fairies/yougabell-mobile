import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
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
  signInWithGoogle,
  signOutFromGoogleIfNative,
} from "../auth/google-sign-in";
import {
  getMobileSupabaseClient,
  getMobileSupabaseConfigError,
} from "../auth/supabase-client";

import {
  getPushPermissionStatus,
  registerPushTokenIfGranted,
  requestPushPermissionAndRegister,
} from "./push-permission";
import { resolvePushNotificationPath } from "./push-notification-routing";
import { useWebviewSource } from "./use-webview-source";
import { webShellStyles as styles } from "./web-shell-styles";
import {
  buildNativeMessageScript,
  buildSessionSyncMessage,
  buildWebViewBootstrapScript,
  parseWebToNativeMessage,
} from "./webview-bridge";

type WebShellPhase = "loading" | "ready" | "error";

void SplashScreen.preventAutoHideAsync().catch(() => {
  // The native splash may already be hidden in tests or during fast refresh.
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function WebShellScreen() {
  const [phase, setPhase] = useState<WebShellPhase>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [startPath, setStartPath] = useState<string | null>(null);
  const source = useWebviewSource(startPath ?? "/mobile-entry");
  const webViewRef = useRef<WebView>(null);
  const configError = getMobileSupabaseConfigError();

  const hideSplashScreen = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => {
      // Ignore duplicate hide calls from reload/error races.
    });
  }, []);

  const resolveInitialPath = useCallback(async () => {
    const { data } = await getMobileSupabaseClient().auth.getSession();
    return data.session ? "/mobile-entry" : "/onboarding/intro";
  }, []);

  const handleRetry = async () => {
    setPhase("loading");
    setStartPath(await resolveInitialPath());
    setReloadKey((current) => current + 1);
  };

  const reloadWebEntry = async () => {
    setPhase("loading");
    setStartPath(await resolveInitialPath());
    setReloadKey((current) => current + 1);
  };

  const syncSessionToWebView = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (configError) {
      hideSplashScreen();
      return;
    }

    let active = true;

    void (async () => {
      const initialPath = await resolveInitialPath();

      if (!active) {
        return;
      }

      setStartPath(initialPath);
    })();

    return () => {
      active = false;
    };
  }, [configError, hideSplashScreen, resolveInitialPath]);

  useEffect(() => {
    if (configError) {
      return;
    }

    const {
      data: { subscription },
    } = getMobileSupabaseClient().auth.onAuthStateChange(() => {
      void syncSessionToWebView();
      // 앱 실행(INITIAL_SESSION)·로그인 시, OS 권한이 이미 허용돼 있으면 토큰을
      // 조용히 재등록한다. 온보딩에서만 등록되던 구조를 보완 — 재로그인 강제 없음.
      void registerPushTokenIfGranted();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configError, syncSessionToWebView]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const path = resolvePushNotificationPath(
          response.notification.request.content.data ?? {},
        );
        if (!path) {
          return;
        }

        setPhase("loading");
        setStartPath(path);
        setReloadKey((current) => current + 1);
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const handleWebMessage = async (event: WebViewMessageEvent) => {
    const message = parseWebToNativeMessage(event.nativeEvent.data);

    if (!message) return;

    switch (message.type) {
      case "WEB_READY":
        await syncSessionToWebView();
        return;
      case "REQUEST_NATIVE_GOOGLE_SIGN_IN":
        try {
          await signInWithGoogle();
          await reloadWebEntry();
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
          await reloadWebEntry();
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
        await Promise.all([
          getMobileSupabaseClient().auth.signOut(),
          signOutFromGoogleIfNative(),
        ]);
        setStartPath("/onboarding/intro");
        return;
      case "REQUEST_PUSH_PERMISSION":
        try {
          const permission = await requestPushPermissionAndRegister();
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
      case "OPEN_EXTERNAL_URL":
        // 처리방침·약관 등 외부 페이지를 시스템 브라우저로 열어 WebView에 갇히지 않게 한다.
        await Linking.openURL(message.payload.url);
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
      {startPath ? (
        <WebView
          key={reloadKey}
          ref={webViewRef}
          testID="webview-shell"
          source={source}
          style={styles.webview}
          injectedJavaScriptBeforeContentLoaded={buildWebViewBootstrapScript()}
          onLoad={() => {
            setPhase("ready");
          }}
          onLoadEnd={() => {
            hideSplashScreen();
          }}
          onError={() => {
            setPhase("error");
            hideSplashScreen();
          }}
          onMessage={(event) => {
            void handleWebMessage(event);
          }}
        />
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
