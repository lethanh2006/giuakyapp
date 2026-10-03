import Constants from "expo-constants";
import { Platform } from "react-native";

const apiPort = process.env.EXPO_PUBLIC_API_PORT || "3000";
const apiPath = process.env.EXPO_PUBLIC_API_PATH || "/api";

function removeTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/api(?:\/.*)?$/, "");
  }
}

function normalizeSocketPath(value: string) {
  const path = value.trim().replace(/^\/+|\/+$/g, "");
  return `/${path || "socket.io"}`;
}

function isAndroidEmulator() {
  if (Platform.OS !== "android") return false;

  const constants = Platform.constants as typeof Platform.constants & {
    Brand?: string;
    Fingerprint?: string;
    Manufacturer?: string;
    Model?: string;
  };
  const deviceInfo = [
    constants.Brand,
    constants.Fingerprint,
    constants.Manufacturer,
    constants.Model,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /generic|emulator|sdk_gphone|google_sdk|android sdk built for/.test(
    deviceInfo,
  );
}

function getExpoHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  return typeof hostUri === "string" ? hostUri.split(":")[0] : undefined;
}

function getDevelopmentUrl() {
  const expoHost = getExpoHost();

  if (isAndroidEmulator()) {
    return `http://10.0.2.2:${apiPort}${apiPath}`;
  }

  if (expoHost) return `http://${expoHost}:${apiPort}${apiPath}`;
  return `http://localhost:${apiPort}${apiPath}`;
}

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!configuredUrl && !__DEV__) {
  throw new Error("EXPO_PUBLIC_API_URL must be configured for production builds");
}

const apiUrl = configuredUrl || getDevelopmentUrl();

export const ipNR = removeTrailingSlash(apiUrl);

export const socketUrl =
  process.env.EXPO_PUBLIC_SOCKET_URL?.trim().replace(/\/+$/, "") ||
  getOrigin(ipNR);

export const socketPath = normalizeSocketPath(
  process.env.EXPO_PUBLIC_SOCKET_PATH || "/socket.io",
);
