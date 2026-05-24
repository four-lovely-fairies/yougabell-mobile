import { StyleSheet } from "react-native";

export const webShellStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffaf4",
  },
  webview: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fffaf4",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2f241f",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#6a5448",
  },
  button: {
    minWidth: 160,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#ff8a5b",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
});
