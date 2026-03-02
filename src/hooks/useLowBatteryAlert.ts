import { useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBattery } from './useBattery';
import { sosAlert } from '../services/api';
import { getLiveLocation } from '../services/locationService';

const BATTERY_THRESHOLD = 15; // percentage
const STORAGE_KEY_ENABLED = 'low_battery_alert_enabled';
const STORAGE_KEY_LAST_ALERT = 'low_battery_last_alert_time';
const MIN_ALERT_INTERVAL = 30 * 60 * 1000; // 30 minutes - prevent spam

interface UseLowBatteryAlertReturn {
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  threshold: number;
  lastAlertTime: Date | null;
  alertsSentCount: number;
}

/**
 * Monitors battery level and automatically triggers SOS alert when battery drops below threshold
 * Prevents spam by enforcing minimum interval between alerts
 */
export function useLowBatteryAlert(): UseLowBatteryAlertReturn {
  const { percentage, isCharging, loading } = useBattery();
  const [isEnabled, setIsEnabledState] = useState(true);
  const [lastAlertTime, setLastAlertTime] = useState<Date | null>(null);
  const [alertsSentCount, setAlertsSentCount] = useState(0);
  const hasTriggeredRef = useRef(false);
  const appState = useRef(AppState.currentState);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const enabled = await AsyncStorage.getItem(STORAGE_KEY_ENABLED);
        if (enabled !== null) {
          setIsEnabledState(enabled === 'true');
        }

        const lastAlert = await AsyncStorage.getItem(STORAGE_KEY_LAST_ALERT);
        if (lastAlert) {
          setLastAlertTime(new Date(lastAlert));
        }
      } catch (error) {
        console.error('[LowBatteryAlert] Failed to load preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Monitor app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - reset trigger to allow new check
        hasTriggeredRef.current = false;
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Monitor battery level and trigger alert
  useEffect(() => {
    if (loading || !isEnabled) return;

    const checkAndAlert = async () => {
      // Don't trigger if:
      // 1. Already triggered in this session
      // 2. Battery is above threshold
      // 3. Device is charging
      if (hasTriggeredRef.current || percentage > BATTERY_THRESHOLD || isCharging) {
        return;
      }

      // Check if enough time has passed since last alert
      if (lastAlertTime) {
        const timeSinceLastAlert = Date.now() - lastAlertTime.getTime();
        if (timeSinceLastAlert < MIN_ALERT_INTERVAL) {
          console.log(
            `[LowBatteryAlert] Skipping alert - last alert was ${Math.round(timeSinceLastAlert / 1000 / 60)} minutes ago`
          );
          return;
        }
      }

      // Mark as triggered to prevent duplicate alerts
      hasTriggeredRef.current = true;

      try {
        console.warn(`[LowBatteryAlert] Battery at ${percentage}% - Triggering automatic SOS`);

        // Get current location
        let location: any = null;
        try {
          location = await getLiveLocation();
        } catch (locError) {
          console.warn('[LowBatteryAlert] Could not get location:', locError);
        }

        // Prepare SOS payload
        const payload: any = {
          alert_type: 'low_battery',
          message: `🔋 Low Battery Alert: Battery at ${percentage}% - Automatic emergency alert`,
          timestamp: new Date().toISOString(),
        };

        if (location) {
          payload.latitude = (location as any).latitude ?? null;
          payload.longitude = (location as any).longitude ?? null;
          if ((location as any).accuracy) {
            payload.accuracy = (location as any).accuracy;
          }
        }

        // Send SOS alert
        await sosAlert(payload);

        // Update last alert time
        const now = new Date();
        await AsyncStorage.setItem(STORAGE_KEY_LAST_ALERT, now.toISOString());
        setLastAlertTime(now);
        setAlertsSentCount((prev) => prev + 1);

        console.log('[LowBatteryAlert] ✅ Automatic SOS sent successfully');

        // Show user notification
        Alert.alert(
          '🔋 Low Battery Alert Sent',
          `Your battery is at ${percentage}%. An automatic emergency alert has been sent to your emergency contacts with your current location.\n\nPlease charge your device immediately.`,
          [{ text: 'OK' }]
        );
      } catch (error: any) {
        console.error('[LowBatteryAlert] Failed to send automatic SOS:', error);
        hasTriggeredRef.current = false; // Allow retry on next check

        // Show error to user
        Alert.alert(
          '⚠️ Low Battery Alert Failed',
          `Your battery is at ${percentage}% but the automatic alert couldn't be sent: ${error?.message || 'Unknown error'}\n\nPlease charge your device and manually trigger SOS if needed.`,
          [{ text: 'OK' }]
        );
      }
    };

    checkAndAlert();
  }, [percentage, isCharging, isEnabled, loading, lastAlertTime]);

  // Function to enable/disable the feature
  const setEnabled = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_ENABLED, enabled.toString());
      setIsEnabledState(enabled);
      
      if (enabled) {
        hasTriggeredRef.current = false; // Reset trigger when enabling
        console.log('[LowBatteryAlert] Low battery alert enabled');
      } else {
        console.log('[LowBatteryAlert] Low battery alert disabled');
      }
    } catch (error) {
      console.error('[LowBatteryAlert] Failed to save enabled state:', error);
    }
  };

  return {
    isEnabled,
    setEnabled,
    threshold: BATTERY_THRESHOLD,
    lastAlertTime,
    alertsSentCount,
  };
}
