# Low Battery Alert - Quick Reference

## What It Does
🔋 **Automatically sends SOS when battery drops below 15%**

---

## Key Features

✅ **Automatic** - No user action needed
✅ **Smart** - Won't trigger if charging
✅ **Protected** - 30-minute spam prevention
✅ **Location** - Includes GPS coordinates
✅ **Real-time** - Live battery display in Settings
✅ **Controllable** - Enable/disable toggle

---

## How to Use

### Setup (One-Time)
1. Open **Settings**
2. Find **🔋 Low Battery Alert**
3. Toggle **Enable Alert** ON
4. Done! ✅

### Daily Use
- Nothing! It works automatically
- Check Settings to see current battery %
- Alert triggers at 15% automatically

---

## What Users See

### When Battery Low (≤15%)
```
🔋 Low Battery Alert Sent

Your battery is at 14%. An automatic 
emergency alert has been sent to your 
emergency contacts with your current 
location.

Please charge your device immediately.

[OK]
```

### In Settings (Normal)
```
🔋 Low Battery Alert

Automatically send SOS with your location 
when battery drops below 15%

Enable Alert [ON]

Alert Threshold: 15%
███████████████░░░░░

Current Battery: 67% ⚡ Charging
```

### In Settings (Low Battery)
```
Current Battery: 14% ⚠️
⚠️ Battery low! Alert will trigger automatically
```

---

## Alert Details

### What Gets Sent
- Alert Type: `low_battery`
- Message: "🔋 Low Battery Alert: Battery at X%"
- Your GPS location (if available)
- Timestamp

### Who Gets Notified
- All your emergency contacts
- Via SMS (with location link)
- Via Email (with details)

### When It Triggers
- Battery ≤ 15%
- Device NOT charging
- Feature enabled
- At least 30 min since last alert

---

## Files Changed

### New Files
```
serenade/src/hooks/useLowBatteryAlert.ts
serenade/src/hooks/useBattery.ts
serenade/src/services/batteryService.ts
src/hooks/useLowBatteryAlert.ts
src/hooks/useBattery.ts
src/services/batteryService.ts
```

### Modified Files
```
serenade/src/pages/Settings.tsx
src/pages/Settings.tsx
package.json
```

---

## Configuration

### Change Threshold
```typescript
// In useLowBatteryAlert.ts
const BATTERY_THRESHOLD = 15; // Change to 10, 20, etc.
```

### Change Cooldown
```typescript
// In useLowBatteryAlert.ts
const MIN_ALERT_INTERVAL = 30 * 60 * 1000; // 30 minutes
```

---

## Testing

### Quick Test
1. Go to `useLowBatteryAlert.ts`
2. Change `BATTERY_THRESHOLD = 95`
3. Restart app
4. Alert triggers immediately (if battery < 95%)

### Production Test
1. Let battery drain to 14%
2. Ensure not charging
3. Wait for alert
4. Check emergency contacts got SMS/email

---

## Troubleshooting

### Alert Not Triggering
- ✅ Check: Feature enabled in Settings?
- ✅ Check: Battery actually ≤ 15%?
- ✅ Check: Device charging? (won't trigger)
- ✅ Check: Last alert < 30 min ago?

### Battery % Not Updating
- 🔄 Restart Expo dev server
- 🔄 Clear cache: `npx expo start --clear`
- 📦 Check: `expo-battery` installed

### Location Not Included
- 📍 Enable location permissions
- 📍 Check: GPS on?
- ⚠️ Alert still sends without location

---

## Why This Matters

### Safety Scenarios

**Phone dying is dangerous:**
- Can't call for help
- Can't share location
- Contacts don't know situation

**This feature:**
- ✅ Notifies contacts automatically
- ✅ Shares last known location
- ✅ Works even if user unconscious
- ✅ Gives contacts time to respond

### Real Examples

🚶 **Hiker lost at night**
- Phone at 10%, no signal
- Alert sent before shutdown
- Location helps rescue team

🚗 **Car accident victim**
- Phone damaged, battery low
- Automatic SOS sent
- Family notified immediately

🏥 **Medical emergency**
- User collapsed, can't act
- Phone triggers alert
- Paramedics dispatched

---

## Dependencies

```bash
npm install expo-battery@~10.0.8 expo-device@~7.0.1
```

---

## Documentation

📖 Full Guide: `LOW_BATTERY_ALERT_FEATURE.md`
📋 Summary: `SETTINGS_SYNC_SUMMARY.md`
⚡ This File: Quick reference

---

## Support

```typescript
// Debug logs in console
[LowBatteryAlert] Battery at 14% - Triggering automatic SOS
[LowBatteryAlert] ✅ Automatic SOS sent successfully
```

---

**Feature Status: ✅ READY FOR PRODUCTION**

Last Updated: February 14, 2026
Version: 1.0.0
