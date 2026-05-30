import "react-native-url-polyfill/auto";

import type { SupportedStorage, Session } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const SESSION_STORAGE_KEY = "yougabell.supabase.session";
const SECURE_STORE_CHUNK_SIZE = 1800;
const CHUNK_META_SUFFIX = ".__chunks";
const CHUNK_VALUE_PREFIX = "chunked:";

function chunkMetaKey(key: string) {
  return `${key}${CHUNK_META_SUFFIX}`;
}

function chunkValueKey(key: string, index: number) {
  return `${key}.${index}`;
}

function parseChunkCount(rawValue: string | null): number | null {
  if (!rawValue?.startsWith(CHUNK_VALUE_PREFIX)) {
    return null;
  }

  const count = Number(rawValue.slice(CHUNK_VALUE_PREFIX.length));
  return Number.isInteger(count) && count > 0 ? count : null;
}

async function removeChunkedValue(key: string) {
  const metaKey = chunkMetaKey(key);
  const chunkCount = parseChunkCount(await SecureStore.getItemAsync(metaKey));

  if (!chunkCount) {
    await SecureStore.deleteItemAsync(metaKey);
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(metaKey),
    ...Array.from({ length: chunkCount }, (_, index) =>
      SecureStore.deleteItemAsync(chunkValueKey(key, index)),
    ),
  ]);
}

export const secureStoreAdapter: SupportedStorage = {
  async getItem(key) {
    const chunkCount = parseChunkCount(
      await SecureStore.getItemAsync(chunkMetaKey(key)),
    );

    if (!chunkCount) {
      return SecureStore.getItemAsync(key);
    }

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) =>
        SecureStore.getItemAsync(chunkValueKey(key, index)),
      ),
    );

    if (chunks.some((chunk) => chunk == null)) {
      return null;
    }

    return chunks.join("");
  },
  async setItem(key, value) {
    await removeChunkedValue(key);

    if (value.length <= SECURE_STORE_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks = Array.from(
      { length: Math.ceil(value.length / SECURE_STORE_CHUNK_SIZE) },
      (_, index) =>
        value.slice(
          index * SECURE_STORE_CHUNK_SIZE,
          (index + 1) * SECURE_STORE_CHUNK_SIZE,
        ),
    );

    await SecureStore.deleteItemAsync(key);
    await Promise.all([
      SecureStore.setItemAsync(
        chunkMetaKey(key),
        `${CHUNK_VALUE_PREFIX}${chunks.length}`,
      ),
      ...chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkValueKey(key, index), chunk),
      ),
    ]);
  },
  async removeItem(key) {
    await Promise.all([SecureStore.deleteItemAsync(key), removeChunkedValue(key)]);
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
