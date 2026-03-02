import { Platform } from 'react-native';

function currentHost() {
  return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
}

async function callProxy(lat: number, lon: number, type: string, radius = 5000) {
  const host = currentHost();
  const url = `http://${host}:8000/api/accounts/places/nearby/?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&type=${encodeURIComponent(type)}&radius=${encodeURIComponent(String(radius))}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const txt = await resp.text().catch(() => null);
    throw new Error(`Places proxy error: ${resp.status} ${txt || resp.statusText}`);
  }
  const data = await resp.json();
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
