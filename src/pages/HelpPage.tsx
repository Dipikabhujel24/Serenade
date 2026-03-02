import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { PageHeader } from "../components/PageHeader";
import { theme } from "../theme";

export default function HelpPage({ navigation }: any) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  type HelpSectionProps = {
    id: string;
    icon: string;
    title: string;
    children: React.ReactNode;
  };

  const HelpSection = ({ id, icon, title, children }: HelpSectionProps) => {
    const isExpanded = expandedSection === id;

    return (
      <View style={[styles.card, theme.shadows.card]}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(id)}
        >
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>{icon}</Text>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? "−" : "+"}</Text>
        </TouchableOpacity>

        {isExpanded && <View style={styles.sectionContent}>{children}</View>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Help & Guide"
        subtitle="Learn how to use Serenade"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Getting Started */}
        <HelpSection id="start" icon="🚀" title="Getting Started">
          <Text style={styles.stepTitle}>1. Complete Your Profile</Text>
          <Text style={styles.stepText}>
            Go to Menu → Profile and add your phone number and personal details.
            This helps emergency contacts identify you.
          </Text>

          <Text style={styles.stepTitle}>2. Add Emergency Contacts</Text>
          <Text style={styles.stepText}>
            Navigate to Menu → Emergency Contacts and add at least 3 trusted
            people. Include their name, phone, and email.
          </Text>

          <Text style={styles.stepTitle}>3. Grant Location Permissions</Text>
          <Text style={styles.stepText}>
            Allow the app to access your location for SOS alerts and live
            tracking features. This is essential for your safety.
          </Text>

          <Text style={styles.stepTitle}>4. Test Features</Text>
          <Text style={styles.stepText}>
            Practice using Fake Call and explore Community Alerts to familiarize
            yourself with the app before an emergency.
          </Text>
        </HelpSection>

        {/* SOS Alert */}
        <HelpSection id="sos" icon="🚨" title="SOS Alert">
          <Text style={styles.helpText}>
            <Text style={styles.bold}>When to Use:</Text> In immediate danger or
            emergency situations.
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>How it Works:{"\n"}</Text>
            1. Tap the large red SOS button on Dashboard{"\n"}
            2. Confirm the alert{"\n"}
            3. Your location and emergency message are sent to all emergency
            contacts{"\n"}
            4. SMS and email notifications are dispatched immediately{"\n"}
            5. Location is automatically recorded in the system
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Tip:</Text> The button is large and
            centered for quick access. Practice tapping it so you can activate
            it quickly if needed.
          </Text>

          <Text style={styles.warningText}>
            ⚠️ Only use for real emergencies. False alarms may cause panic.
          </Text>
        </HelpSection>

        {/* Live Location */}
        <HelpSection id="location" icon="📍" title="Live Location Tracking">
          <Text style={styles.helpText}>
            <Text style={styles.bold}>Purpose:</Text> Share your real-time
            location with trusted contacts during your journey.
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>How to Use:{"\n"}</Text>
            1. Tap "Live location" on Dashboard{"\n"}
            2. Your current GPS coordinates are captured{"\n"}
            3. Location is sent to backend and shared with companions{"\n"}
            4. Use this when traveling alone or in unfamiliar areas
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Best Practices:{"\n"}</Text>
            • Share location before entering taxi/ride{"\n"}
            • Update periodically during long journeys{"\n"}
            • Inform contacts when you've arrived safely
          </Text>
        </HelpSection>

        {/* Safety Companion */}
        <HelpSection id="companion" icon="🧭" title="Safety Companion">
          <Text style={styles.helpText}>
            <Text style={styles.bold}>What is it:</Text> Assign a trusted person
            to monitor your journey and receive alerts if you deviate from your
            path or miss check-ins.
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Setup:{"\n"}</Text>
            1. Go to Menu → Safety Companion{"\n"}
            2. Enter username of your trusted companion{"\n"}
            3. Set check-in interval (default 5 minutes){"\n"}
            4. Set deviation threshold (how far you can stray){"\n"}
            5. Activate monitoring
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>During Journey:{"\n"}</Text>
            • App checks in automatically at set intervals{"\n"}
            • Companion is alerted if you miss check-in{"\n"}
            • Companion is notified if you deviate from expected route{"\n"}
            • You can manually check-in anytime
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>When to Use:</Text> Late night travel,
            unfamiliar areas, first dates, solo trips.
          </Text>
        </HelpSection>

        {/* Community Alerts */}
        <HelpSection id="community" icon="👥" title="Community Alerts">
          <Text style={styles.helpText}>
            <Text style={styles.bold}>Purpose:</Text> Crowdsourced safety
            information. Report incidents and view alerts from other users in
            your area.
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Viewing Alerts:{"\n"}</Text>
            1. Tap "Community Alerts" on Dashboard{"\n"}
            2. See nearby incidents on map{"\n"}
            3. Alerts show type, location, and time{"\n"}
            4. Avoid areas with recent danger alerts
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Broadcasting Alert:{"\n"}</Text>
            1. Tap "Broadcast Alert" button{"\n"}
            2. Select alert type (harassment, danger, suspicious){"\n"}
            3. Add description{"\n"}
            4. Your location is automatically included{"\n"}
            5. Alert is visible to nearby users
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Alert Types:{"\n"}</Text>
            🚨 Danger - Active threats or violence{"\n"}
            ⚠️ Harassment - Unwanted advances or stalking{"\n"}
            👁️ Suspicious - Concerning behavior or situations
          </Text>

          <Text style={styles.warningText}>
            ⚠️ Only report genuine concerns. Abuse of this feature undermines
            community safety.
          </Text>
        </HelpSection>

        {/* Fake Call */}
        <HelpSection id="fakecall" icon="📞" title="Fake Call">
          <Text style={styles.helpText}>
            <Text style={styles.bold}>Purpose:</Text> Create a realistic fake
            call to escape uncomfortable or dangerous social situations.
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>How to Use:{"\n"}</Text>
            1. Go to Menu → Fake Call or tap quick action{"\n"}
            2. Toggle between Male (दाजु) or Female (आमा) voice{"\n"}
            3. Phone vibrates like incoming call{"\n"}
            4. Tap "Accept" to answer{"\n"}
            5. Nepali voice recording plays (if added){"\n"}
            6. Use as excuse to leave situation{"\n"}
            7. Tap "End Call" when safe
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>When to Use:{"\n"}</Text>
            • Uncomfortable conversations{"\n"}
            • Persistent unwanted advances{"\n"}
            • Feeling unsafe in social setting{"\n"}
            • Need polite excuse to leave{"\n"}
            • Suspicious taxi/ride situation
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Pro Tip:</Text> Practice using it so you
            can activate quickly and appear natural when needed.
          </Text>

          <Text style={styles.noteText}>
            📝 Note: Add Nepali voice recordings to assets/audio/ folder for full
            audio experience. See audio folder README for instructions.
          </Text>
        </HelpSection>

        {/* Nearby Help */}
        <HelpSection id="nearby" icon="🏥" title="Nearby Help Finder">
          <Text style={styles.helpText}>
            <Text style={styles.bold}>Purpose:</Text> Quickly find nearest
            hospitals and police stations using OpenStreetMap data.
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>How to Use:{"\n"}</Text>
            1. Tap "Nearby Help" on Dashboard{"\n"}
            2. App gets your GPS location{"\n"}
            3. Searches for hospitals and police within 5km{"\n"}
            4. Results sorted by distance{"\n"}
            5. Tap any location to open in Google/Apple Maps{"\n"}
            6. Get turn-by-turn directions
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Filters:{"\n"}</Text>
            • Both: Shows all hospitals and police{"\n"}
            • Hospital: Medical emergencies only{"\n"}
            • Police: Security concerns only
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Radius:</Text> Adjust search radius from
            1km to 10km based on urban/rural area.
          </Text>
        </HelpSection>

        {/* Emergency Contacts */}
        <HelpSection id="contacts" icon="📱" title="Emergency Contacts">
          <Text style={styles.helpText}>
            <Text style={styles.bold}>Setup:{"\n"}</Text>
            1. Go to Menu → Emergency Contacts{"\n"}
            2. Tap "Add Contact"{"\n"}
            3. Enter name, phone number, and email{"\n"}
            4. Save contact{"\n"}
            5. Add at least 3 trusted people
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Who to Add:{"\n"}</Text>
            • Family members (parents, siblings){"\n"}
            • Close friends who are usually available{"\n"}
            • Neighbors or local contacts{"\n"}
            • Workplace emergency contact
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Best Practices:{"\n"}</Text>
            • Inform contacts they're on your list{"\n"}
            • Keep contact info updated{"\n"}
            • Test by sending them a location share{"\n"}
            • Add both mobile and alternate numbers
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>What They Receive:{"\n"}</Text>
            When you trigger SOS, contacts get:{"\n"}
            • SMS with your location coordinates{"\n"}
            • Email with map link to your location{"\n"}
            • Notification of emergency status{"\n"}
            • Timestamp of alert
          </Text>
        </HelpSection>

        {/* Privacy & Data */}
        <HelpSection id="privacy" icon="🔒" title="Privacy & Data">
          <Text style={styles.helpText}>
            <Text style={styles.bold}>What We Collect:{"\n"}</Text>
            • Account info (username, email, phone){"\n"}
            • Location data (only when you use features){"\n"}
            • Emergency contacts (stored securely){"\n"}
            • Community alert reports
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>What We Don't Do:{"\n"}</Text>
            • Track your location continuously{"\n"}
            • Share data with third parties{"\n"}
            • Sell your information{"\n"}
            • Monitor you without your consent
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Data Control:{"\n"}</Text>
            • You control when location is shared{"\n"}
            • Delete your account anytime{"\n"}
            • Export your data on request{"\n"}
            • All data encrypted in transit
          </Text>

          <Text style={styles.helpText}>
            <Text style={styles.bold}>Location Privacy:{"\n"}</Text>
            • GPS only accessed when you use features{"\n"}
            • Location shared only with your emergency contacts{"\n"}
            • Community alerts show approximate area, not exact location{"\n"}
            • No background tracking
          </Text>
        </HelpSection>

        {/* Troubleshooting */}
        <HelpSection id="trouble" icon="🔧" title="Troubleshooting">
          <Text style={styles.problemTitle}>Location Not Working</Text>
          <Text style={styles.solutionText}>
            ✓ Enable GPS/Location Services on your device{"\n"}
            ✓ Grant location permission to Serenade app{"\n"}
            ✓ Ensure you're outdoors or near window for GPS signal{"\n"}
            ✓ Restart the app
          </Text>

          <Text style={styles.problemTitle}>Can't Add Emergency Contact</Text>
          <Text style={styles.solutionText}>
            ✓ Check internet connection{"\n"}
            ✓ Verify phone number format (+977...){"\n"}
            ✓ Ensure valid email address{"\n"}
            ✓ Try restarting the app
          </Text>

          <Text style={styles.problemTitle}>Community Alerts Not Loading</Text>
          <Text style={styles.solutionText}>
            ✓ Check internet connection{"\n"}
            ✓ Ensure location permission granted{"\n"}
            ✓ OpenStreetMap servers may be slow (wait a moment){"\n"}
            ✓ Pull down to refresh
          </Text>

          <Text style={styles.problemTitle}>Fake Call No Audio</Text>
          <Text style={styles.solutionText}>
            ✓ Add Nepali voice MP3 files to assets/audio/{"\n"}
            ✓ Check device volume is up{"\n"}
            ✓ Ensure silent mode is off{"\n"}
            ✓ Test on real device (not web)
          </Text>

          <Text style={styles.problemTitle}>Login Issues</Text>
          <Text style={styles.solutionText}>
            ✓ Check username and password{"\n"}
            ✓ Ensure backend server is running{"\n"}
            ✓ Check internet connection{"\n"}
            ✓ Try "Forgot Password" if needed
          </Text>
        </HelpSection>

        {/* Safety Tips */}
        <HelpSection id="tips" icon="💡" title="Safety Tips">
          <Text style={styles.tipText}>
            🔹 <Text style={styles.bold}>Trust Your Instincts:</Text> If
            something feels wrong, it probably is. Use the app immediately.
          </Text>

          <Text style={styles.tipText}>
            🔹 <Text style={styles.bold}>Stay Aware:</Text> Keep phone charged
            and accessible. Know where your SOS button is.
          </Text>

          <Text style={styles.tipText}>
            🔹 <Text style={styles.bold}>Plan Ahead:</Text> Check community
            alerts before traveling to new areas.
          </Text>

          <Text style={styles.tipText}>
            🔹 <Text style={styles.bold}>Share Your Plans:</Text> Tell someone
            where you're going and when you'll return.
          </Text>

          <Text style={styles.tipText}>
            🔹 <Text style={styles.bold}>Use Safety Companion:</Text> For late
            night travel or unfamiliar routes.
          </Text>

          <Text style={styles.tipText}>
            🔹 <Text style={styles.bold}>Avoid Isolated Areas:</Text> Stick to
            well-lit, populated areas when possible.
          </Text>

          <Text style={styles.tipText}>
            🔹 <Text style={styles.bold}>Practice Using Features:</Text> Don't
            wait for emergency to learn the app.
          </Text>

          <Text style={styles.tipText}>
            🔹 <Text style={styles.bold}>Update Contacts Regularly:</Text> Ensure
            emergency contacts are current and reachable.
          </Text>

          <Text style={styles.tipText}>
            🔹 <Text style={styles.bold}>Battery Management:</Text> Keep phone
            charged, especially when traveling.
          </Text>

          <Text style={styles.tipText}>
            🔹 <Text style={styles.bold}>Community Participation:</Text> Report
            incidents to help other women stay safe.
          </Text>
        </HelpSection>

        {/* Emergency Numbers */}
        <View style={[styles.card, theme.shadows.card, styles.emergencyCard]}>
          <Text style={styles.emergencyTitle}>🚨 Emergency Numbers Nepal</Text>
          <Text style={styles.emergencyText}>Police: 100</Text>
          <Text style={styles.emergencyText}>Ambulance: 102</Text>
          <Text style={styles.emergencyText}>Fire Brigade: 101</Text>
          <Text style={styles.emergencyText}>
            Women's Rights Helpline: 1145
          </Text>
          <Text style={styles.emergencyText}>
            National Human Rights: 1145
          </Text>
        </View>

        {/* Still Need Help */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.sectionTitle}>Still Need Help?</Text>
          <Text style={styles.helpText}>
            If you can't find what you're looking for, contact our support team:
          </Text>
          <Text style={styles.contactText}>📧 support@serenade.com</Text>
          <Text style={styles.contactText}>🌐 www.serenade.com/support</Text>
          <Text style={[styles.helpText, { marginTop: 12 }]}>
            We typically respond within 24 hours.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text,
    flex: 1,
  },
  expandIcon: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: theme.fontWeights.bold,
    width: 30,
    textAlign: "center",
  },
  sectionContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  helpText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: theme.fontWeights.semi,
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  stepText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  bold: {
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text,
  },
  warningText: {
    fontSize: 13,
    color: "#FF6B6B",
    backgroundColor: "#FF6B6B20",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    lineHeight: 20,
  },
  noteText: {
    fontSize: 13,
    color: "#4A90E2",
    backgroundColor: "#4A90E220",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    lineHeight: 20,
  },
  problemTitle: {
    fontSize: 14,
    fontWeight: theme.fontWeights.semi,
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  solutionText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 8,
    paddingLeft: 8,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  emergencyCard: {
    backgroundColor: "#FF6B6B15",
    borderWidth: 2,
    borderColor: "#FF6B6B",
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: theme.fontWeights.bold,
    color: "#FF6B6B",
    marginBottom: 16,
    textAlign: "center",
  },
  emergencyText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: theme.fontWeights.semi,
    marginBottom: 8,
    textAlign: "center",
  },
  contactText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: theme.fontWeights.semi,
    marginBottom: 6,
  },
});
