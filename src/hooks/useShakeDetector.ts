import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

type Options = {
  threshold?: number; // g force threshold (approx 1 = 1g)
  timeout?: number; // ms cooldown between shakes
  updateInterval?: number; // ms sensor poll interval
};

export default function useShakeDetector(onShake: () => void, opts?: Options) {
  const lastShakeRef = useRef<number>(0);
  const lastMagRef = useRef<number>(0);
  const { threshold = 1.6, timeout = 3000, updateInterval = 100 } = opts || {};

  useEffect(() => {
    let mounted = true;
    Accelerometer.setUpdateInterval(updateInterval);

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      if (!mounted) return;
      const mag = Math.sqrt(x * x + y * y + z * z);
      // detect quick peak above threshold
      const now = Date.now();
      const lastMag = lastMagRef.current || 0;

      // simple peak detection: current magnitude exceeds threshold and is greater than previous
      if (mag > threshold && mag > lastMag && now - lastShakeRef.current > timeout) {
        lastShakeRef.current = now;
        try {
          onShake();
        } catch (e) {
          // swallow
        }
      }

      lastMagRef.current = mag;
    });

    return () => {
      mounted = false;
      sub && sub.remove();
    };
  }, [onShake, threshold, timeout, updateInterval]);
}
