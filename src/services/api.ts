import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const HOST = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
const BASE_URL = `http://${HOST}:8000/api/auth`;

const DEBUG_API = true;

async function debugFetch(url: string, options: any) {
  if (DEBUG_API) {
    try {
      console.log("[API] Request ->", options.method || "GET", url, options.headers, options.body);
    } catch {}
  }

  let resp: Response;
  try {
    resp = await fetch(url, options);
  } catch (err) {
    console.error("[API] Network error ->", err, url);
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
  const url = `${BASE_URL}/signup/`;
  return await debugFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
}

// ---------------- LOGIN ----------------
export async function loginUser(username: string, password: string) {
  const url = `${BASE_URL}/login/`;
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

  const url = `${BASE_URL}/sos/`;
  return await debugFetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
}

export async function sendLocation(payload: any = {}) {
  const token = await AsyncStorage.getItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!token) console.warn("[API] sendLocation called without accessToken in AsyncStorage");

  const url = `${BASE_URL}/location/`;
  return await debugFetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
}

export async function getRecentLocations(minutes = 5, limit = 100) {
  const token = await AsyncStorage.getItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${BASE_URL}/locations/?minutes=${encodeURIComponent(
    String(minutes)
  )}&limit=${encodeURIComponent(String(limit))}`;
  const data = await debugFetch(url, { method: "GET", headers });
  // API returns { status: 'success', data: [...] } — normalize to return the array
  if (data && typeof data === "object" && Array.isArray((data as any).data)) return (data as any).data;
  return data;
}

// ---------------- DEVICE (FCM) ----------------
export async function registerDeviceToken(token: string, platform = "web") {
  const access = await AsyncStorage.getItem("accessToken");
  const headers: any = { "Content-Type": "application/json" };
  if (access) headers["Authorization"] = `Bearer ${access}`;
  const url = `${BASE_URL}/devices/register/`;
  return await debugFetch(url, { method: "POST", headers, body: JSON.stringify({ token, platform }) });
}
