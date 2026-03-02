import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const PRIMARY_HOST = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
// Try a small list of likely local hosts for different emulator/device setups.
const CANDIDATE_HOSTS = Platform.OS === "android"
  ? ["10.0.2.2", "10.0.3.2", "127.0.0.1"]
  : ["127.0.0.1"];

function buildBaseUrlForHost(host: string) {
  return `http://${host}:8000/api/auth`;
}

let overrideHost: string | null = null;

export async function setApiHost(host: string | null) {
  overrideHost = host;
  try {
    if (host) await AsyncStorage.setItem("api_host", host);
    else await AsyncStorage.removeItem("api_host");
  } catch {}
}

export async function initApiHostFromStorage() {
  try {
    const h = await AsyncStorage.getItem("api_host");
    if (h) overrideHost = h;
  } catch {}
}

function currentHost() {
  return overrideHost || PRIMARY_HOST;
}

function buildUrl(path: string) {
  // path should include leading slash, e.g. '/signup/' or '/sos/'
  const base = buildBaseUrlForHost(currentHost());
  // ensure we don't double up slashes
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
}

const DEBUG_API = true;

async function debugFetch(url: string, options: any) {
  if (DEBUG_API) {
    try {
      console.log("[API] Request ->", options.method || "GET", url, options.headers, options.body);
    } catch {}
  }

  // Attempt the provided URL first, then try fallback hosts if network errors occur.
  let resp: Response | null = null;
  const triedUrls: string[] = [];

  const tryFetch = async (candidateUrl: string) => {
    triedUrls.push(candidateUrl);
    return await fetch(candidateUrl, options);
  };

  try {
    try {
      resp = await tryFetch(url);
    } catch (err) {
      console.warn("[API] Primary fetch failed, attempting fallbacks ->", err, url);
      // try candidate hosts by replacing the host portion of the url when possible
      const urlObj = new URL(url);
      for (const host of CANDIDATE_HOSTS) {
        const candidateBase = buildBaseUrlForHost(host);
        // rebuild a candidate URL that keeps the path after /api/auth
        const pathAfterApi = urlObj.pathname + urlObj.search;
        const candidateUrl = `${candidateBase}${pathAfterApi.replace(/^\/api\/auth/, "")}`;
        try {
          resp = await tryFetch(candidateUrl);
          if (resp) break;
        } catch (e) {
          // continue trying other hosts
          console.warn("[API] fallback host failed:", host, e);
        }
      }
      if (!resp) throw err;
    }
  } catch (err) {
    console.error("[API] Network error ->", err, url, "(tried:", triedUrls.join(","), ")");
    throw err;
  }

  let text: string | null = null;
  try {
    text = await resp.text();
  } catch (e) {
    console.warn("[API] Failed to read response text", e);
  }

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  if (DEBUG_API) console.log("[API] Response <-", resp.status, data);

  if (!resp.ok) {
    const errMsg = (data && (data.error || data.errors || JSON.stringify(data))) || resp.statusText;
    const err = new Error(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
    (err as any).status = resp.status;
    (err as any).response = data;
    throw err;
  }

  return data;
}

// ---------------- SIGNUP ----------------
export async function signupUser(
  username: string,
  email: string,
  password: string
) {
  const url = buildUrl("/signup/");
  return await debugFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
}

// ---------------- LOGIN ----------------
export async function loginUser(username: string, password: string) {
  const url = buildUrl("/login/");
  return await debugFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

// ---------------- SOS ALERT ----------------
export async function sosAlert(payload: any = {}) {
  const token = await AsyncStorage.getItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!token) console.warn("[API] sosAlert called without accessToken in AsyncStorage");

  const url = buildUrl("/sos/");
  return await debugFetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
}

export async function sendLocation(payload: any = {}) {
  const token = await AsyncStorage.getItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!token) console.warn("[API] sendLocation called without accessToken in AsyncStorage");

  const url = buildUrl("/location/");
  return await debugFetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
}

export async function getRecentLocations(minutes = 5, limit = 100) {
  const token = await AsyncStorage.getItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = buildUrl(`/locations/?minutes=${encodeURIComponent(String(minutes))}&limit=${encodeURIComponent(
    String(limit)
  )}`);
  const data = await debugFetch(url, { method: "GET", headers });
  // API returns { status: 'success', data: [...] } — normalize to return the array
  if (data && typeof data === "object" && Array.isArray((data as any).data)) return (data as any).data;
  return data;
}

// ---------------- ALERT HISTORY ----------------
export async function getAlertHistory() {
  const token = await AsyncStorage.getItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = buildUrl("/alert-history/");
  const data = await debugFetch(url, { method: "GET", headers });
  if (data && typeof data === "object" && Array.isArray((data as any).data)) return (data as any).data;
  return data;
}

// ---------------- DEVICE (FCM) ----------------
export async function registerDeviceToken(token: string, platform = "web") {
  const access = await AsyncStorage.getItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (access) headers["Authorization"] = `Bearer ${access}`;
  const url = buildUrl("/devices/register/");
  return await debugFetch(url, { method: "POST", headers, body: JSON.stringify({ token, platform }) });
}
