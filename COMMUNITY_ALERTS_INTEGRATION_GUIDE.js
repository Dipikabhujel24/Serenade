// INTEGRATION GUIDE: Adding Community Alerts to Your App

/**
 * Step 1: Update your navigation structure to include the CommunityAlertsPage
 * 
 * If you're using React Navigation with tabs or drawer:
 */

// Example: Adding to Tab Navigation (app/(tabs)/_layout.tsx)
import { CommunityAlertsPage } from '../../src/pages/CommunityAlertsPage';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors[colorScheme ?? 'light'].tint,
      }}
    >
      <Tabs.Screen
        name="index"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      
      {/* Add this new tab */}
      <Tabs.Screen
        name="community"
        component={CommunityAlertsPage}
        options={{
          title: 'Safety',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🚨</Text>,
        }}
      />
      
      <Tabs.Screen
        name="profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

/**
 * Step 2: Or add as a modal/stack screen
 */

// In your main navigation (e.g., AppNavigator.tsx)
import { CommunityAlertsPage } from '../../src/pages/CommunityAlertsPage';

export function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Group>
        <Stack.Screen 
          name="Tabs" 
          component={TabNavigator} 
        />
        
        {/* Add this for modal presentation */}
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen 
            name="CommunityAlerts" 
            component={CommunityAlertsPage}
            options={{
              headerTitle: 'Safety Community',
            }}
          />
        </Stack.Group>
      </Stack.Group>
    </Stack.Navigator>
  );
}

/**
 * Step 3: Or add as a menu item/button that navigates
 */

// In your menu or dashboard
import { useNavigation } from '@react-navigation/native';

function MenuScreen() {
  const navigation = useNavigation();
  
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('CommunityAlerts')}
      style={styles.menuButton}
    >
      <Text>🚨 Safety Community</Text>
      <Text>View nearby alerts</Text>
    </TouchableOpacity>
  );
}

/**
 * Step 4: Backend Setup (One-time)
 */

// In your Django backend directory:
// Run these commands to create the database tables

/*
cd Backend/backend

# Create migrations for the CommunityAlert model
python manage.py makemigrations

# Apply migrations to database
python manage.py migrate

# Start the Django server (if not already running)
python manage.py runserver 0.0.0.0:8000
*/

/**
 * Step 5: Testing the Complete Feature
 */

// Test Scenario 1: Broadcast an Alert
/*
1. Open CommunityAlertsPage on your device
2. Verify location is enabled (check status indicator)
3. Tap the 🚨 FAB button
4. Select alert type (e.g., "Danger")
5. Type a message (e.g., "Road hazard ahead")
6. Set radius (default 5 km)
7. Tap "Broadcast Alert"
8. You should see "Alert broadcasted to nearby users"
*/

// Test Scenario 2: Receive Alert in Real-time
/*
1. On a second device/emulator, open CommunityAlertsPage
2. Make sure it's connected to WebSocket (watch for console logs)
3. Broadcast an alert from first device
4. On second device, new alert should appear in real-time
5. No need to manually refresh
*/

// Test Scenario 3: Search Nearby Alerts
/*
1. Change your location (simulate with Android Emulator)
2. Tap different radius buttons (3 km, 5 km, 10 km, 15 km)
3. Pull to refresh to fetch latest alerts
4. Alerts should update based on new location
*/

// Test Scenario 4: Report False Alert
/*
1. On any alert, tap "Report"
2. Confirm that you want to report it
3. Alert should disappear from your list
4. After 5 reports total, alert is deactivated for everyone
*/

/**
 * Step 6: Customization Options
 */

// Modify colors in CommunityAlertMap component
const ALERT_TYPE_COLORS = {
  'danger': '#FF4444',    // Red
  'accident': '#FF8800',  // Orange
  'hazard': '#FFCC00',    // Yellow
  'other': '#0099FF'      // Blue
};

// Adjust default search radius
const DEFAULT_SEARCH_RADIUS = 5; // km

// Change WebSocket reconnection timeout
const WEBSOCKET_RECONNECT_INTERVAL = 3000; // ms

// Set alert expiration time (backend)
const ALERT_EXPIRATION_HOURS = 1; // 1 hour auto-expire

/**
 * Step 7: Environment Configuration
 */

// Ensure your API endpoint matches the server address
// For Android Emulator: http://10.0.2.2:8000
// For iOS Simulator: http://localhost:8000
// For Real Device: http://<your-ip>:8000

// Update in useCommunityAlerts.ts and other services:
const API_BASE = 'http://10.0.2.2:8000'; // Android Emulator
// const API_BASE = 'http://localhost:8000'; // iOS Simulator
// const API_BASE = 'http://192.168.x.x:8000'; // Real device (update IP)

/**
 * Step 8: Monitoring & Debugging
 */

// Check backend logs for broadcasts:
/*
python manage.py runserver 0.0.0.0:8000 --verbosity 2

Look for lines like:
"Community alert id=123 type=danger"
"WebSocket connected: user=456"
*/

// Check frontend WebSocket in React Native debugger:
/*
// Add to useCommunityAlerts hook for debugging:
ws.onopen = () => console.log('✓ WebSocket connected');
ws.onmessage = (e) => console.log('📬 Message:', e.data);
ws.onerror = (e) => console.error('❌ Error:', e);
ws.onclose = () => console.log('✕ WebSocket closed');
*/

/**
 * Step 9: Production Checklist
 */

/*
☐ Update API_BASE_URL to production server
☐ Configure ALLOWED_HOSTS in Django settings
☐ Enable HTTPS/WSS for production WebSockets
☐ Implement rate limiting on backend
☐ Add logging to track alert creation/reports
☐ Set up alert expiration cron job
☐ Configure email alerts for spam reports
☐ Add moderation dashboard for admin
☐ Test with multiple concurrent users
☐ Monitor WebSocket connection stability
*/

/**
 * Step 10: Common Issues & Solutions
 */

/*
Issue: WebSocket not connecting
Solution: 
- Check ALLOWED_HOSTS includes your server
- Verify Channels is installed and configured
- Check ASGI server is running (daphne)
- Look for "403 Forbidden" or "CORS" errors

Issue: Alerts not appearing in nearby list
Solution:
- Verify location has been granted
- Check latitude/longitude are being sent
- Ensure alert hasn't expired (1 hour max)
- Verify search radius includes alert's broadcast radius

Issue: App crashes when broadcasting
Solution:
- Ensure location permission is granted
- Check message is not empty
- Verify radius value is numeric and > 0
- Look for API response errors in console

Issue: Old alerts still appearing
Solution:
- Alerts auto-expire after 1 hour
- Expired alerts filtered in nearby_community_alerts view
- Check database for expires_at timestamps
*/

export default {};
