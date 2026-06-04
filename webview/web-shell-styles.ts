import { StyleSheet } from "react-native";

export const webShellStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1eaff",
  },
  webview: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1eaff",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#262626",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#555555",
  },
  button: {
    minWidth: 160,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#9572FF",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
});
