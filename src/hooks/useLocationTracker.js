import * as Location from 'expo-location';
import { sendLocation } from '../services/api.js';

let subscriber = null;

export default function useLocationTracker() {
  async function start(options = { distanceInterval: 5, timeInterval: 5000 }) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return;
      }

      if (subscriber) {
        // already running
        return;
      }

      subscriber = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, distanceInterval: options.distanceInterval, timeInterval: options.timeInterval },
        (loc) => {
          try {
            const payload = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
              timestamp: loc.timestamp,
            };
            // fire-and-forget
            sendLocation(payload).catch((e) => console.warn('sendLocation failed', e));
          } catch (e) {
            console.warn('Location watch callback error', e);
          }
        }
      );
    } catch (e) {
      console.warn('Failed to start location tracker', e);
    }
  }

  function stop() {
    try {
      if (subscriber) {
        subscriber.remove();
        subscriber = null;
      }
    } catch (e) {
      console.warn('Failed to stop location tracker', e);
    }
  }

  return { start, stop };
}
