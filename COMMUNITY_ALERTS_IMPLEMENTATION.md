# Community Alerts Implementation Summary

## Overview
Community Alerts feature enables users to broadcast safety alerts to nearby users in real-time, creating a crowd-based safety network where users can warn each other about dangers, accidents, hazards, and other important information.

## Architecture

### Backend Components

#### 1. **Models** (`accounts/models.py`)
```python
class CommunityAlert(models.Model):
    ALERT_TYPE_CHOICES = [
        ('danger', 'Danger'),
        ('accident', 'Accident'),
        ('hazard', 'Hazard'),
        ('other', 'Other'),
    ]
    
    user = ForeignKey(User, null=True, on_delete=models.SET_NULL)
    alert_type = CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    message = TextField()
    latitude = FloatField()
    longitude = FloatField()
    radius_km = FloatField(default=5)  # Broadcast radius
    created_at = DateTimeField(auto_now_add=True)
    expires_at = DateTimeField()
    is_active = BooleanField(default=True)
    views_count = IntegerField(default=0)
    reports_count = IntegerField(default=0)  # Auto-deactivate at 5 reports
```

#### 2. **Serializers** (`accounts/serializers.py`)
- `CommunityAlertSerializer`: Full serialization with read-only username field

#### 3. **API Endpoints** (`accounts/urls.py`)
- `POST /api/auth/community-alert/broadcast/` - Create and broadcast alert
- `GET /api/auth/community-alert/nearby/` - Get alerts within radius (no auth required)
- `POST /api/auth/community-alert/<id>/report/` - Report spam/false alerts

#### 4. **Views** (`accounts/views.py`)

**broadcast_community_alert (POST)**
- Creates alert with 1-hour default expiration
- Broadcasts to "community_alerts" WebSocket group
- Supports anonymous users
- Payload: `alert_type`, `message`, `latitude`, `longitude`, `radius_km`
- Response: `{"status": "success", "alert_id": <int>}`

**nearby_community_alerts (GET)**
- Returns alerts within search radius or alert radius (whichever is larger)
- Filters by: location (haversine formula), expiration, active status
- Query params: `latitude`, `longitude`, `radius` (default 5km)
- Response: `{"status": "success", "data": [CommunityAlertSerializer]}`

**report_community_alert (POST)**
- Increments report count
- Auto-deactivates alert after 5 reports
- Removes from list for user who reported it
- Response: `{"status": "success"}`

#### 5. **WebSocket Consumer** (`accounts/consumers.py`)
- Subscribes to "community_alerts" group on connect
- Handles `community.alert` messages
- Real-time broadcast to all connected users

### Frontend Components

#### 1. **Hook: useCommunityAlerts** (`src/hooks/useCommunityAlerts.ts`)
Features:
- Fetch nearby alerts via REST API
- Broadcast alerts via REST API
- Report alerts via REST API
- Real-time WebSocket connection to receive live alerts
- Haversine distance calculation
- Auto-reconnection with 3s retry interval

Returns:
```typescript
{
  alerts: CommunityAlert[],          // Sorted by distance
  loading: boolean,
  error: string | null,
  fetchNearbyAlerts: (radius: number) => Promise<void>,
  broadcastAlert: (...) => Promise<number>,
  reportAlert: (alertId: number) => Promise<boolean>
}
```

#### 2. **Component: CommunityAlertMap** (`src/components/CommunityAlertMap.tsx`)
- Display nearby alerts in scrollable list
- Color-coded by alert type (danger, accident, hazard, other)
- Shows distance, time ago, username
- Pull-to-refresh functionality
- "View on Map" button (opens device maps app)
- "Report" button for spam alerts
- Empty state when no alerts nearby

#### 3. **Component: BroadcastCommunityAlert** (`src/components/BroadcastCommunityAlert.tsx`)
- Modal for creating and sending alerts
- Alert type selection (danger, accident, hazard, other)
- Message input with 500-char limit
- Broadcast radius selection (1-100+ km)
- Location display
- Live preview of alert as it appears to others
- Real-time character count
- Form validation and error handling

#### 4. **Page: CommunityAlertsPage** (`src/pages/CommunityAlertsPage.tsx`)
- Main UI for community alerts feature
- Location status indicator
- Search radius control (3/5/10/15 km presets)
- FAB (Floating Action Button) to broadcast alerts
- Displays location permission status
- Handles permission denied errors
- Alert detail modal on tap

## Data Flow

### Broadcasting an Alert
```
User fills form in BroadcastCommunityAlert
    ↓
Calls broadcastAlert() from useCommunityAlerts hook
    ↓
POST /api/auth/community-alert/broadcast/
    ↓
Backend creates CommunityAlert model with 1-hour expiration
    ↓
Broadcasts via async_to_sync to "community_alerts" group
    ↓
All WebSocket-connected users receive message
    ↓
useCommunityAlerts hook validates distance and adds to list
    ↓
CommunityAlertMap updates and shows new alert
```

### Receiving Alerts
Two mechanisms:
1. **REST API Pull**: `fetchNearbyAlerts()` - HTTP GET request
2. **WebSocket Push**: Real-time messages via "community_alerts" group

### Reporting Alerts
```
User taps "Report" on CommunityAlertMap
    ↓
POST /api/auth/community-alert/<id>/report/
    ↓
Backend increments reports_count
    ↓
If reports_count >= 5, sets is_active = False
    ↓
Alert hidden from nearby_community_alerts queries
```

## Distance Calculation
Uses Haversine formula to calculate great-circle distance between coordinates:
```
R = 6371 km (Earth radius)
a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)
c = 2·atan2(√a, √(1−a))
d = R·c
```

## Real-time Features
- WebSocket group: `"community_alerts"`
- Message type: `"community.alert"`
- Auto-reconnect on disconnect (3 second retry)
- Distance-based filtering on client
- Live updates without manual refresh

## Security Features
- No auth required for broadcast/nearby (for emergency use)
- Rate limiting recommended (not yet implemented)
- Report system to prevent spam (5-report auto-deactivation)
- Auto-expiration after 1 hour
- User tracking (optional, null if anonymous)

## Frontend Integration Points

To add CommunityAlertsPage to your navigation:

```typescript
// In your navigation/AuthNavigator.tsx or main app
import { CommunityAlertsPage } from '../pages/CommunityAlertsPage';

// Add to tab/drawer navigation
<Stack.Screen name="CommunityAlerts" component={CommunityAlertsPage} />
```

## Testing the Feature

1. **Run migrations**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

2. **Start backend**:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

3. **Start app** and navigate to CommunityAlertsPage

4. **Test broadcast**:
   - Tap FAB button
   - Select alert type
   - Enter message
   - Submit

5. **Test nearby alerts**:
   - In another device/emulator, change location
   - Pull to refresh
   - New alerts should appear

6. **Test WebSocket**:
   - Broadcast alert from one device
   - Should appear in real-time on other devices
   - No manual refresh needed

## API Examples

### Broadcast Alert
```bash
curl -X POST http://localhost:8000/api/auth/community-alert/broadcast/ \
  -H "Content-Type: application/json" \
  -d '{
    "alert_type": "danger",
    "message": "Armed robbery on Main St",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radius_km": 2
  }'
```

### Get Nearby Alerts
```bash
curl "http://localhost:8000/api/auth/community-alert/nearby/?latitude=40.7128&longitude=-74.0060&radius=5"
```

### Report Alert
```bash
curl -X POST http://localhost:8000/api/auth/community-alert/123/report/
```

## Future Enhancements
- Rate limiting per IP/user
- Alert categories with emojis/icons
- Comment system on alerts
- User reputation/trust scores
- Media attachments (images/video)
- Alert severity levels
- Geofencing notifications
- Community moderation dashboard
- Alert clustering on map view
- Push notifications for nearby alerts

## Files Modified/Created

**Backend:**
- `accounts/models.py` - Added CommunityAlert model
- `accounts/serializers.py` - Added CommunityAlertSerializer
- `accounts/views.py` - Added 3 view functions
- `accounts/urls.py` - Added 3 URL routes
- `accounts/consumers.py` - Updated to handle community alerts

**Frontend:**
- `src/hooks/useCommunityAlerts.ts` - New hook
- `src/components/CommunityAlertMap.tsx` - New component
- `src/components/BroadcastCommunityAlert.tsx` - New component
- `src/pages/CommunityAlertsPage.tsx` - New page

## Status
✅ Backend implementation complete
✅ Frontend components complete
⏳ Database migrations needed (run `makemigrations` and `migrate`)
⏳ Navigation integration needed (add to app routing)
