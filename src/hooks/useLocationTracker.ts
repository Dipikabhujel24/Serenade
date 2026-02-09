import { useRef, useCallback } from "react";
import { getLiveLocation } from "../services/locationService";
import { sendLocation } from "../services/api";

// Simple hook that returns start/stop functions for periodic location uploads.
export default function useLocationTracker(intervalMs = 10000) {
  const timerRef = useRef<number | null>(null as any);

  const sendOnce = useCallback(async () => {
    try {
      const loc = await getLiveLocation();
      await sendLocation({ latitude: loc.latitude, longitude: loc.longitude });
    } catch (e) {
      // swallow; tracking should be resilient
      console.warn("location tracker error", e);
    }
  }, []);

  const start = useCallback(() => {
    // immediately send then interval
    sendOnce();
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      sendOnce();
    }, intervalMs) as any;
  }, [intervalMs, sendOnce]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current as any);
      timerRef.current = null;
    }
  }, []);

  return { start, stop };
}
