import { Platform } from "react-native";
import { getStoredItem, setStoredItem, removeStoredItem } from "./storage.js";

// Default primary host for common emulator setups. For physical devices
// we also include the developer machine LAN IP below so the app can
// reach a locally-running backend without manual config.
const PRIMARY_HOST = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
// Try a small list of likely local hosts for different emulator/device setups.
// Add your development machine LAN IP here so physical phones can reach the server.
const CANDIDATE_HOSTS = Platform.OS === "android"
  ? ["10.0.2.2", "10.0.3.2", "127.0.0.1", "192.168.1.71"]
  : ["127.0.0.1", "192.168.1.71"];

function buildBaseUrlForHost(host: string) {
  return `http://${host}:8000/api/auth`;
}

let overrideHost: string | null = null;

export async function setApiHost(host: string | null) {
  overrideHost = host;
  try {
    if (host) await setStoredItem("api_host", host);
    else await removeStoredItem("api_host");
  } catch {}
}

export async function initApiHostFromStorage() {
  try {
    const h = await getStoredItem("api_host");
    if (h) overrideHost = h;
    else {
      // If no host stored, try to auto-discover a reachable host from candidates
      try {
        await discoverAndSetHost();
      } catch (e) {
        // discovery failed — ignore and fall back to defaults
      }
    }
  } catch {}
}

// Helper: fetch with timeout
async function fetchWithTimeout(url: string, options: any = {}, timeout = 2000) {
  return await Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
  ]);
}

// Try candidate hosts and persist the first that responds quickly.
async function discoverAndSetHost() {
  for (const host of CANDIDATE_HOSTS.concat([PRIMARY_HOST])) {
    try {
      const base = buildBaseUrlForHost(host);
      const url = `${base}/login/`;
      const resp = await fetchWithTimeout(url, { method: 'GET' }, 2000);
      if (resp && ((resp as Response).ok || [400,401,403,405].includes(((resp as any).status)))) {
        // found a reachable host
        await setApiHost(host);
        overrideHost = host;
        if (DEBUG_API) console.log('[API] auto-discovered host ->', host);
        return host;
      }
    } catch (e) {
      // try next host
      if (DEBUG_API) console.warn('[API] discovery failed for', host, e?.message || e);
    }
  }
  throw new Error('No reachable API host found');
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
  // If the app has been put into offline mode via AsyncStorage key
  // `offline_mode` we should short-circuit network calls and throw
  // a suppressed error so the UI doesn't spam alerts or show timeouts.
  try {
    const offlineFlag = await getStoredItem("offline_mode");
    if (offlineFlag === "true") {
      const e: any = new Error("Offline mode enabled");
      e.suppressAlert = true;
      throw e;
    }
  } catch (e) {
    // ignore storage read errors and continue with network attempt
  }

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
    // Distinguish network/connectivity errors to avoid surfacing noisy alerts
    const msg = (err && (err as any).message) || String(err);
    const isNetworkErr = /network request timed out|network request failed|fetch failed|Network request timed out/i.test(msg);
    if (isNetworkErr) {
      console.warn("[API] Network error (suppressed) ->", msg, url, "(tried:", triedUrls.join(","), ")");
      const e: any = new Error("Network unavailable");
      e.suppressAlert = true;
      throw e;
    }
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
  const token = await getStoredItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!token) console.warn("[API] sosAlert called without accessToken in AsyncStorage");

  const url = buildUrl("/sos/");
  return await debugFetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
}

export async function sendLocation(payload: any = {}) {
  const token = await getStoredItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!token) console.warn("[API] sendLocation called without accessToken in AsyncStorage");

  const url = buildUrl("/location/");
  return await debugFetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
}

export async function getRecentLocations(minutes = 5, limit = 100) {
  const token = await getStoredItem("accessToken");
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
  const token = await getStoredItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = buildUrl("/alert-history/");
  const data = await debugFetch(url, { method: "GET", headers });
  if (data && typeof data === "object" && Array.isArray((data as any).data)) return (data as any).data;
  return data;
}

// ---------------- DEVICE (FCM) ----------------
export async function registerDeviceToken(token: string, platform = "web") {
  const access = await getStoredItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (access) headers["Authorization"] = `Bearer ${access}`;
  const url = buildUrl("/devices/register/");
  return await debugFetch(url, { method: "POST", headers, body: JSON.stringify({ token, platform }) });
}
