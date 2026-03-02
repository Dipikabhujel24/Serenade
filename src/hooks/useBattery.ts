import React, { useEffect, useState } from 'react';
import {
  getBatteryStatus,
  getBatteryPercentage,
  watchBatteryLevel,
  isBatteryCritical,
  isDeviceCharging,
  BatteryStatus,
} from '../services/batteryService';

interface UseBatteryReturn {
  level: number;
  percentage: number;
  isLow: boolean;
  isCritical: boolean;
  isCharging: boolean;
  loading: boolean;
  error: string | null;
  status: BatteryStatus | null;
}

/**
 * Hook to monitor device battery level in real-time
 * Warns when battery drops below 15% (low) or 10% (critical)
 */
export function useBattery(): UseBatteryReturn {
  const [status, setStatus] = useState<BatteryStatus | null>(null);
  const [percentage, setPercentage] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get initial status
        const initialStatus = await getBatteryStatus();
        setStatus(initialStatus);

        const pct = await getBatteryPercentage();
        setPercentage(pct);

        const critical = await isBatteryCritical();
        setIsCritical(critical);

        // Subscribe to battery changes
        unsubscribe = await watchBatteryLevel((newStatus) => {
          setStatus(newStatus);
          setPercentage(Math.round(newStatus.level * 100));
          setIsCritical(newStatus.level < 0.1);

          // Log when battery becomes low or critical
          if (newStatus.isLow && newStatus.level < 0.15) {
            console.warn(
              `[useBattery] Battery low: ${Math.round(newStatus.level * 100)}%`
            );
          }
          if (newStatus.level < 0.1) {
            console.error('[useBattery] Battery critical: < 10%');
          }
        });
      } catch (err: any) {
        setError(err?.message || 'Failed to initialize battery monitoring');
        console.error('[useBattery] Init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return {
    level: status?.level ?? 1,
    percentage,
    isLow: status?.isLow ?? false,
    isCritical,
    isCharging: status?.isCharging ?? false,
    loading,
    error,
    status,
  };
}
