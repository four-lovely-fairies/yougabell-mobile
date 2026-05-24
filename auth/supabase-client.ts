import "react-native-url-polyfill/auto";

import type { SupportedStorage, Session } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const SESSION_STORAGE_KEY = "yougabell.supabase.session";

const secureStoreAdapter: SupportedStorage = {
  getItem(key) {
    return SecureStore.getItemAsync(key);
  },
  setItem(key, value) {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem(key) {
    return SecureStore.deleteItemAsync(key);
  },
};

function requireSupabaseUrl() {
  const value = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!value) {
    throw new Error("EXPO_PUBLIC_SUPABASE_URL 환경 변수가 필요합니다.");
  }

  return value;
}

function requireSupabasePublishableKey() {
  const value = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!value) {
    throw new Error(
      "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY 환경 변수가 필요합니다.",
    );
  }

  return value;
}

let mobileSupabaseClient: ReturnType<typeof createClient> | undefined;

export function getMobileSupabaseClient() {
  if (!mobileSupabaseClient) {
    mobileSupabaseClient = createClient(
      requireSupabaseUrl(),
      requireSupabasePublishableKey(),
      {
        auth: {
          storageKey: SESSION_STORAGE_KEY,
          storage: secureStoreAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      },
    );
  }

  return mobileSupabaseClient;
}

export type MobileSupabaseSession = Session;
