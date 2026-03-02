# Low Battery Alert Feature

## Overview
Automatically triggers an emergency SOS alert when device battery drops below 15%. This ensures emergency contacts are notified when the phone is dying, which is critical during emergencies.

---

## How It Works

### Battery Monitoring
- **Real-time tracking**: Uses `expo-battery` to monitor battery level changes
- **Threshold**: 15% battery level
- **Smart detection**: Only triggers when:
  - Battery ≤ 15%
  - Device is NOT charging
  - Feature is enabled
  - At least 30 minutes since last alert (prevents spam)

### Automatic SOS Trigger
When battery drops below threshold:

1. ✅ **Captures location** - Gets GPS coordinates (if available)
2. ✅ **Sends SOS alert** - Triggers automatic emergency alert
3. ✅ **Notifies contacts** - SMS/Email sent to emergency contacts
4. ✅ **Shows user notification** - Alert confirms action taken
5. ✅ **Logs event** - Records timestamp to prevent duplicates

---

## User Experience

### What Users See

**In Settings:**
- Toggle to enable/disable low battery alerts
- Current battery percentage displayed in real-time
- Warning shown when battery is low and alert is active
- Visual indicators: ⚡ for charging, ⚠️ for low battery

**When Battery Drops Below 15%:**
```
🔋 Low Battery Alert Sent

Your battery is at 14%. An automatic emergency 
alert has been sent to your emergency contacts 
with your current location.

Please charge your device immediately.

[OK]
```

**If Alert Fails:**
```
⚠️ Low Battery Alert Failed

Your battery is at 14% but the automatic alert 
couldn't be sent: Network error

Please charge your device and manually trigger 
SOS if needed.

[OK]
```

---

## Technical Implementation

### Files Created/Modified

**New Files:**
- `serenade/src/hooks/useLowBatteryAlert.ts` - Main monitoring hook
- `src/hooks/useLowBatteryAlert.ts` - Copy for root src
- `src/hooks/useBattery.ts` - Battery status hook
- `src/services/batteryService.ts` - Battery API wrapper

**Modified Files:**
- `serenade/src/pages/Settings.tsx` - Integrated battery UI
- `src/pages/Settings.tsx` - Integrated battery UI
- `package.json` - Added expo-battery dependency

### Key Components

#### 1. Battery Service
```typescript
// services/batteryService.ts
export async function getBatteryStatus(): Promise<BatteryStatus> {
  const level = await Battery.getBatteryLevelAsync();
  const state = await Battery.getBatteryStateAsync();
  const isCharging = state === Battery.BatteryState.CHARGING;
  const isLow = level < 0.15; // 15%
  
  return { level, isLow, state, isCharging };
}
```

#### 2. Battery Hook
```typescript
// hooks/useBattery.ts
export function useBattery() {
  // Subscribes to battery level changes
  // Returns: { percentage, isCharging, loading }
}
```

#### 3. Low Battery Alert Hook
```typescript
// hooks/useLowBatteryAlert.ts
export function useLowBatteryAlert() {
  // Monitors battery and triggers SOS at 15%
  // Returns: { isEnabled, setEnabled, threshold }
}
```

#### 4. Settings Integration
```typescript
// pages/Settings.tsx
const { percentage, isCharging } = useBattery();
const { isEnabled, setEnabled, threshold } = useLowBatteryAlert();

// Real-time battery display
<Text>Current Battery: {percentage}%{isCharging ? ' ⚡ Charging' : ''}</Text>

// Warning when low
{percentage <= threshold && !isCharging && isEnabled && (
  <Text>⚠️ Battery low! Alert will trigger automatically</Text>
)}
```

---

## SOS Alert Payload

When automatically triggered, sends:

```json
{
  "alert_type": "low_battery",
  "message": "🔋 Low Battery Alert: Battery at 14% - Automatic emergency alert",
  "timestamp": "2026-02-14T10:30:00.000Z",
  "latitude": 27.7172,
  "longitude": 85.3240,
  "accuracy": 10.5
}
```

---

## Spam Prevention

**30-Minute Cooldown:**
- First alert sent immediately when battery ≤ 15%
- Subsequent alerts blocked for 30 minutes
- Timer resets when app is closed and reopened
- Prevents multiple alerts from minor battery fluctuations

**State Management:**
- `hasTriggeredRef`: Session-level flag (resets on app reopen)
- `lastAlertTime`: Persistent timestamp in AsyncStorage
- `MIN_ALERT_INTERVAL`: 30 minutes (configurable)

---

## Backend Integration

### Database Model
```python
# accounts/models.py
class Alert(models.Model):
    alert_type = models.CharField(
        choices=[
            ('sos', 'SOS'),
            ('low_battery', 'Low Battery'),
            ('community', 'Community')
        ]
    )
    # ... latitude, longitude, message, timestamp
```

### Notification Flow
1. Backend receives `alert_type: "low_battery"`
2. Fetches user's emergency contacts
3. Sends SMS with location link
4. Sends email with details
5. Broadcasts via WebSocket to connected clients

---

## Settings UI

### serenade/src/pages/Settings.tsx (Modern)
- Card-based design with theme system
- Real-time battery percentage
- Color-coded status (red when low)
- Confirmation dialog on enable/disable
- Visual slider showing threshold

### src/pages/Settings.tsx (Pink Theme)
- Pink gradient background
- Same functionality as serenade version
- Matches existing Dashboard pink theme

---

## Configuration

### Customizable Constants
```typescript
const BATTERY_THRESHOLD = 15; // percentage
const MIN_ALERT_INTERVAL = 30 * 60 * 1000; // 30 minutes
```

### Storage Keys
```typescript
const STORAGE_KEY_ENABLED = 'low_battery_alert_enabled';
const STORAGE_KEY_LAST_ALERT = 'low_battery_last_alert_time';
```

---

## Testing Guide

### Manual Testing

1. **Enable Feature:**
   - Open Settings
   - Toggle "Enable Alert" ON
   - Verify confirmation message appears

2. **Check Battery Display:**
   - Observe real-time percentage updates
   - Plug/unplug charger to see ⚡ indicator
   - Verify color changes when low

3. **Simulate Low Battery:**
   ```typescript
   // In useLowBatteryAlert.ts - for testing only
   const BATTERY_THRESHOLD = 95; // Test with 95% instead
   ```
   - Battery will trigger when below 95%
   - Verify SOS alert sent
   - Check emergency contacts notified

4. **Verify Cooldown:**
   - Trigger first alert
   - Try triggering again immediately
   - Should be blocked for 30 minutes

5. **Test Without Location:**
   - Disable location services
   - Trigger low battery alert
   - Verify SOS sent without coordinates

### Automated Testing
```typescript
// Test battery alert logic
describe('useLowBatteryAlert', () => {
  it('triggers SOS when battery drops below 15%', async () => {
    const { result } = renderHook(() => useLowBatteryAlert());
    // Mock battery at 14%
    // Expect sosAlert to be called
  });
  
  it('respects 30-minute cooldown', async () => {
    // Set lastAlertTime to 10 minutes ago
    // Attempt trigger
    // Expect sosAlert NOT called
  });
});
```

---

## Error Handling

### Location Unavailable
- Still sends SOS without coordinates
- Message indicates location unavailable
- Backend handles missing lat/long gracefully

### Network Failure
- Shows error alert to user
- Resets trigger flag to allow retry
- Logs error for debugging

### Permission Denied
- Location permission not required
- Alert sent with message only
- User prompted to enable location

---

## Why This Feature Matters

### Safety Perspective
1. **Phone dying is dangerous** - User may be unable to call for help
2. **Proactive notification** - Contacts alerted before phone shuts down
3. **Location included** - Last known position shared automatically
4. **No user action needed** - Works even if user unconscious/unable to act

### Real-World Scenarios
- **Lost at night** - Phone battery draining while hiking
- **Accident victim** - Phone damaged, battery dying
- **Medical emergency** - User unable to manually trigger SOS
- **Kidnapping/assault** - Discreet automatic alert without interaction

---

## User Instructions

### Setup (Tell Users)

1. **Add Emergency Contacts First:**
   - Go to Emergency Contacts
   - Add at least 2-3 trusted contacts
   - Include phone numbers for SMS alerts

2. **Enable Low Battery Alert:**
   - Open Settings
   - Find "🔋 Low Battery Alert"
   - Toggle "Enable Alert" ON

3. **Keep Location Enabled:**
   - Settings → Privacy → Location Services
   - Allow "Serenade" to access location
   - Choose "Always" or "While Using"

4. **Maintain Battery Health:**
   - Charge before reaching 15%
   - Carry power bank during travel
   - Enable battery saver mode when low

### What to Expect

✅ **Automatic protection** - No action needed when battery low
✅ **One-time alert** - Won't spam you or contacts
✅ **Visual warnings** - See low battery status in Settings
✅ **Peace of mind** - Contacts notified before phone dies

---

## Future Enhancements

### Potential Features
- [ ] Configurable threshold (10-30%)
- [ ] Custom alert message templates
- [ ] Battery health tracking
- [ ] Power-saving mode auto-enable
- [ ] Estimated time until shutdown
- [ ] Multiple threshold levels (15%, 10%, 5%)
- [ ] Silent notification option
- [ ] Battery drain rate analysis

### Advanced Options
- [ ] Location-based alerts (only in certain areas)
- [ ] Time-based alerts (only during night)
- [ ] Contact prioritization (notify some contacts only)
- [ ] Alert escalation (retry with different method)

---

## Dependencies

### npm Packages
```json
{
  "expo-battery": "~10.0.8",
  "expo-device": "~7.0.4",
  "@react-native-async-storage/async-storage": "^2.2.0"
}
```

### Expo SDK
- Requires Expo SDK 52 or higher
- expo-battery for battery monitoring
- expo-device for device info

### Permissions
- No special permissions required
- Location permission optional (for coordinates)
- Battery info available by default

---

## Troubleshooting

### Alert Not Triggering

**Check:**
1. Feature enabled in Settings?
2. Battery actually below 15%?
3. Device charging? (won't trigger if charging)
4. Less than 30 min since last alert?

**Debug:**
```typescript
console.log('[LowBatteryAlert] percentage:', percentage);
console.log('[LowBatteryAlert] isEnabled:', isEnabled);
console.log('[LowBatteryAlert] isCharging:', isCharging);
console.log('[LowBatteryAlert] lastAlert:', lastAlertTime);
```

### Battery Percentage Not Updating

**Issue:** Static percentage in Settings

**Solution:**
- Check expo-battery installed: `npm list expo-battery`
- Restart Expo dev server
- Clear cache: `npx expo start --clear`
- Rebuild app if on physical device

### SOS Alert Failing

**Issue:** Alert trigger but notification fails

**Solution:**
- Check network connection
- Verify backend server running
- Ensure valid auth token in AsyncStorage
- Check emergency contacts exist in database

---

## Conclusion

The Low Battery Alert feature provides **critical safety protection** by automatically notifying emergency contacts when a user's phone is dying. It works silently in the background, requires no user action, and includes intelligent spam prevention.

**Key Benefits:**
- ✅ Automatic emergency response
- ✅ Works without user action
- ✅ Includes location data
- ✅ Prevents alert spam
- ✅ Real-time battery monitoring
- ✅ Graceful error handling

This feature can literally **save lives** by ensuring help is notified even when the user's phone is about to die.
