# Live Location Tracking Setup

This guide explains how live location tracking works in the Serenade app and how to use it.

## Features

✅ **Real-time GPS tracking** - Continuous location updates every 5 seconds or 10 meters  
✅ **Permission handling** - Automatic requests for location permissions  
✅ **High accuracy** - Uses device GPS for precise coordinates  
✅ **Address lookup** - Reverse geocoding to get street addresses  
✅ **SOS integration** - Location automatically shared during emergency alerts  
✅ **Background support** - Android background location tracking  
✅ **Web compatible** - Falls back to browser Geolocation API  

---

## Location Services

### `locationService.ts`

Main service for GPS operations:

```typescript
import {
  getLiveLocation,              // One-time fetch (legacy)
  getCurrentLocationDetailed,   // One-time fetch with full coords
  requestLocationPermission,    // Request user permission
  requestBackgroundPermission,  // Android background permission
  watchLocation,               // Start real-time tracking
  checkLocationPermission,     // Check if permitted
  getAddressFromCoords,        // Reverse geocode
  isLocationServiceEnabled,    // Check GPS enabled
} from "../services/locationService";
```

### `useLocation` Hook

React hook for location in components:

```typescript
import { useLocation } from "../hooks/useLocation";

function MyComponent() {
  const {
    location,           // Current coords: { latitude, longitude, accuracy, altitude, etc }
    address,           // Reverse geocoded address string
    loading,           // Loading state
    error,             // Error message
    hasPermission,     // Permission granted
    requestPermission, // Request permission function
    getCurrentLocation,// Get location once
    startTracking,     // Start live tracking
    stopTracking,      // Stop tracking
  } = useLocation();

  return (
    <View>
      <Text>Lat: {location?.latitude}</Text>
      <Text>Lon: {location?.longitude}</Text>
      <Button title="Start Tracking" onPress={startTracking} />
    </View>
  );
}
```

---

## Screens

### `LiveLocationPage.tsx`

Full-featured live location tracking screen with:
- Get current location button
- Start/stop live tracking controls
- Display of latitude, longitude, accuracy, altitude, speed, heading
- Reverse geocoded address
- Links to Google Maps
- Copy coordinates button

```typescript
import LiveLocationScreen from "../pages/LiveLocationPage";

// Use in navigation
```

---

## SOS Integration

When a user triggers **SOS**, the location is automatically:

1. ✅ **Captured** - Gets precise GPS coordinates
2. ✅ **Sent to backend** - Included in alert payload
3. ✅ **Logged to database** - Alert record stores location
4. ✅ **Notified to contacts** - Emergency contacts get location link in SMS
5. ✅ **Broadcasted** - Real-time WebSocket sends location to all clients

**SOS with Location:**

```typescript
// In SOSPage.tsx
const sendSos = async () => {
  const loc = await getCurrentLocationDetailed();
  
  const payload = {
    alert_type: "sos",
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracy: loc.accuracy,
  };
  
  await sosAlert(payload);
  // Emergency contacts notified with location!
};
```

---

## Permissions Setup

### iOS (app.json)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermissions": "Allow Serenade to access your location for safety features."
        }
      ]
    ]
  }
}
```

### Android (app.json)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "isAndroidDangerousPermissionUserInitiated": true
        }
      ]
    ]
  }
}
```

### Native Android (AndroidManifest.xml)

Already added by expo-location plugin:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

---

## User Permission Flow

1. **First time using location** → App requests permission
2. **User grants permission** → Location services become available
3. **User denies permission** → Error message, prompt to enable in settings
4. **For SOS** → Can still send SOS even without permission (will try to get location)

---

## Data Structure

Location object:

```typescript
interface LocationCoords {
  latitude: number;        // GPS latitude
  longitude: number;       // GPS longitude
  accuracy: number | null; // ±meters
  altitude: number | null; // meters above sea level
  altitudeAccuracy: number | null;
  heading: number | null;  // 0-360 degrees
  speed: number | null;    // m/s
}
```

---

## Testing

### Android Emulator

To simulate location on Android emulator:

1. Open Emulator settings (three dots)
2. Go to **Location** tab
3. Enter coordinates:
   - Latitude: `40.7128`
   - Longitude: `-74.0060` (New York)
4. Press **Send**

### iOS Simulator

To simulate location on iOS simulator:

1. In Xcode: **Features → Location → Custom Location**
2. Enter coordinates
3. Or use predefined locations (Apple, San Francisco, etc)

### Real Device

Just grant location permission when prompted and GPS will work automatically.

---

## Example: Complete Location Tracking Flow

```typescript
import { useLocation } from "../hooks/useLocation";
import { sosAlert } from "../services/api";

export default function SafetyScreen() {
  const { location, startTracking, stopTracking, requestPermission } = useLocation();

  const handleEmergency = async () => {
    // Ensure permission
    const granted = await requestPermission();
    if (!granted) return;

    // Start tracking
    await startTracking();

    // Send SOS with current location
    await sosAlert({
      alert_type: "sos",
      latitude: location?.latitude,
      longitude: location?.longitude,
    });

    // Keep tracking for 15 minutes
    setTimeout(() => stopTracking(), 15 * 60 * 1000);
  };

  return (
    <Button title="🚨 Emergency" onPress={handleEmergency} />
  );
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Permission denied" | Go to app settings → Permissions → Location → Allow |
| "Location unavailable" | Enable GPS in device settings, wait for fix |
| "Inaccurate location" | Move outdoors, wait longer for GPS lock |
| "No address" | Location captured but reverse geocoding unavailable |
| Web not working | Browser must have HTTPS (geolocation API requirement) |

---

## Performance Notes

- **Update frequency**: Every 5 seconds or 10 meters (whichever comes first)
- **Battery impact**: High accuracy GPS uses ~5-10% battery/hour
- **Network**: Location is cached locally, only sent to server on explicit action (SOS, location endpoint)
- **Background**: On Android, location tracking continues even with app in background

---

## API Endpoints Used

- `POST /api/auth/sos/` - Send SOS alert with location
- `POST /api/auth/location/` - Send location update
- `GET /api/auth/locations/` - Fetch recent locations

All endpoints handle missing location gracefully (not required).
