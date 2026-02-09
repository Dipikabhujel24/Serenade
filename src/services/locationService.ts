import * as Location from "expo-location";
import { Platform } from "react-native";

function getBrowserLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocation is not supported by this browser."));
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        reject(new Error(err.message || "Failed to get location from browser."));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export async function getLiveLocation() {
  // On web, prefer the browser Geolocation API for a simpler permission flow
  if (Platform.OS === "web") {
    try {
      return await getBrowserLocation();
    } catch (err) {
      throw new Error(
        `Location error (web): ${err?.message || "permission denied or unavailable"}`
      );
    }
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      throw new Error(
        "Location permission denied. Please enable location/GPS and allow the app to access it."
      );
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (err: any) {
    // Provide clearer guidance for common cases
    const msg = err?.message || String(err);
    throw new Error(`Location error: ${msg}`);
  }
}
