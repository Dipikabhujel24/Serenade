import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface BatteryStatus {
  level: number; // 0-1
  isLow: boolean; // true if < 15%
  state: Battery.BatteryState;
  isCharging: boolean;
  deviceModel?: string;
}

/**
 * Get current battery status
 */
export async function getBatteryStatus(): Promise<BatteryStatus> {
  try {
    if (Platform.OS === 'web') {
      return {
        level: 1,
        isLow: false,
        state: Battery.BatteryState.UNKNOWN,
        isCharging: false,
      };
    }

    const level = await Battery.getBatteryLevelAsync();
    const state = await Battery.getBatteryStateAsync();
    const isCharging = state === Battery.BatteryState.CHARGING || 
                       state === Battery.BatteryState.FULL;
    const isLow = level < 0.15; // 15%

    return {
      level,
      isLow,
      state,
      isCharging,
      deviceModel: Device.modelName,
    };
  } catch (error) {
    console.error('[BatteryService] Error getting battery status:', error);
    return {
      level: 0.5,
      isLow: false,
      state: Battery.BatteryState.UNKNOWN,
      isCharging: false,
    };
  }
}

/**
 * Subscribe to battery level changes
 * Returns unsubscribe function
 */
export async function watchBatteryLevel(
  callback: (status: BatteryStatus) => void
): Promise<() => void> {
  try {
    if (Platform.OS === 'web') {
      // Web doesn't support battery API
      return () => {};
    }

    const subscription = Battery.addBatteryLevelListener(async (levelEvent) => {
      const status = await getBatteryStatus();
      callback(status);
    });

    return () => {
      subscription.remove();
    };
  } catch (error) {
    console.error('[BatteryService] Error watching battery:', error);
    return () => {};
  }
}

/**
 * Get battery percentage as integer (0-100)
 */
export async function getBatteryPercentage(): Promise<number> {
  const status = await getBatteryStatus();
  return Math.round(status.level * 100);
}

/**
 * Check if battery is critically low (< 10%)
 */
export async function isBatteryCritical(): Promise<boolean> {
  const status = await getBatteryStatus();
  return status.level < 0.1;
}

/**
 * Check if device is currently charging
 */
export async function isDeviceCharging(): Promise<boolean> {
  const status = await getBatteryStatus();
  return status.isCharging;
}

/**
 * Format battery status as a readable string
 */
export function formatBatteryStatus(status: BatteryStatus): string {
  const percentage = Math.round(status.level * 100);
  const charging = status.isCharging ? ' (Charging)' : '';
  const critical = status.level < 0.1 ? ' - CRITICAL' : '';

  return `${percentage}%${charging}${critical}`;
}
