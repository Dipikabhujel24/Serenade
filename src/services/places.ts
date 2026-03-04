import { Platform } from 'react-native';
import { getStoredItem } from './storage.js';

function defaultHost() {
  return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
}

// small fetch-with-timeout helper to avoid long blocking requests
async function fetchWithTimeout(url: string, options: any = {}, timeout = 3000) {
  return await Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
  ]);
}

async function resolveHost() {
  try {
    const h = await getStoredItem('api_host');
    if (h) return h;
  } catch {}
  return defaultHost();
}

async function callProxy(lat: number, lon: number, type: string, radius = 5000) {
  const host = await resolveHost();
  const url = `http://${host}:8000/api/accounts/places/nearby/?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&type=${encodeURIComponent(type)}&radius=${encodeURIComponent(String(radius))}`;
  let resp: Response;
  try {
    resp = (await fetchWithTimeout(url, {}, 3000)) as Response;
  } catch (e: any) {
    const msg = (e && e.message) || String(e);
    if (/timeout|network/i.test(msg)) throw new Error('Network timeout while fetching nearby places');
    throw e;
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => null);
    throw new Error(`Places proxy error: ${resp.status} ${txt || resp.statusText}`);
  }
  const data = await resp.json().catch(() => null);
  if (!data || data.status !== 'success') {
    throw new Error(`Places proxy returned error: ${JSON.stringify(data)}`);
  }
  return data.data.results || [];
}

export async function getNearbyHospitals(lat: number, lon: number) {
  return await callProxy(lat, lon, 'hospital');
}

export async function getNearbyPoliceStations(lat: number, lon: number) {
  return await callProxy(lat, lon, 'police');
}
