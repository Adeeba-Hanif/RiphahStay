import Constants from "expo-constants";

const FALLBACK_API_BASE = "http://localhost:3001/api";

function getExpoHostIp() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";

  if (!hostUri) return null;
  return hostUri.split(":")[0] || null;
}

export function resolveApiBaseUrl(rawBaseUrl) {
  const configuredBaseUrl = rawBaseUrl || FALLBACK_API_BASE;
  const expoHostIp = getExpoHostIp();

  try {
    const parsed = new URL(configuredBaseUrl);
    const isLocalHost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

    if (isLocalHost && expoHostIp) {
      parsed.hostname = expoHostIp;
      return parsed.toString().replace(/\/$/, "");
    }

    return configuredBaseUrl.replace(/\/$/, "");
  } catch {
    return configuredBaseUrl.replace(/\/$/, "");
  }
}

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_SERVER_URI
);
