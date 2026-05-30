import * as SecureStore from "expo-secure-store";

import { secureStoreAdapter } from "../supabase-client";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedSecureStore = jest.mocked(SecureStore);

describe("secureStoreAdapter", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("작은 값은 단일 키로 저장한다", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(null);

    await secureStoreAdapter.setItem("session", "short-value");

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      "session",
      "short-value",
    );
  });

  it("큰 값은 여러 조각으로 나눠 저장한다", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    const largeValue = "x".repeat(5000);

    await secureStoreAdapter.setItem("session", largeValue);

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      "session.__chunks",
      "chunked:3",
    );
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      "session.0",
      largeValue.slice(0, 1800),
    );
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      "session.1",
      largeValue.slice(1800, 3600),
    );
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      "session.2",
      largeValue.slice(3600),
    );
  });

  it("조각 저장된 값을 다시 합쳐 읽는다", async () => {
    mockedSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === "session.__chunks") return "chunked:2";
      if (key === "session.0") return "hello ";
      if (key === "session.1") return "world";
      return null;
    });

    await expect(secureStoreAdapter.getItem("session")).resolves.toBe(
      "hello world",
    );
  });

  it("삭제 시 단일 키와 조각 키를 모두 지운다", async () => {
    mockedSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === "session.__chunks") return "chunked:2";
      return null;
    });

    await secureStoreAdapter.removeItem("session");

    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith("session");
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "session.__chunks",
    );
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith("session.0");
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith("session.1");
  });
});
