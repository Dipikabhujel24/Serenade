import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { PageHeader } from "../components/PageHeader";
import { theme } from "../theme";

export default function AboutPage({ navigation }: any) {
  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open link:", err)
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="About Serenade"
        subtitle="Your Safety Companion"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Info */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.appName}>🛡️ Serenade</Text>
          <Text style={styles.tagline}>Empowering Women's Safety in Nepal</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        {/* Mission */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.text}>
            Serenade is a comprehensive safety application designed specifically
            for women in Nepal. We provide real-time emergency features,
            community support, and innovative safety tools to help you feel
            secure wherever you go.
          </Text>
        </View>

        {/* Key Features */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.sectionTitle}>Key Features</Text>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🚨</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>SOS Alert</Text>
              <Text style={styles.featureDesc}>
                Instantly notify emergency contacts with your location
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📍</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Live Location Tracking</Text>
              <Text style={styles.featureDesc}>
                Share your real-time location with trusted contacts
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>👥</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Community Alerts</Text>
              <Text style={styles.featureDesc}>
                Report and view safety incidents in your area
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🧭</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Safety Companion</Text>
              <Text style={styles.featureDesc}>
                Assign trusted person to monitor your journey
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📞</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Fake Call</Text>
              <Text style={styles.featureDesc}>
                Escape uncomfortable situations with realistic call
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏥</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Nearby Help</Text>
              <Text style={styles.featureDesc}>
                Find nearby hospitals and police stations
              </Text>
            </View>
          </View>
        </View>

        {/* Technology */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.sectionTitle}>Technology</Text>
          <Text style={styles.text}>
            Built with React Native, Expo, and Django, Serenade uses GPS
            tracking, real-time notifications, and OpenStreetMap data to provide
            reliable safety features. All location data is encrypted and only
            shared with your chosen emergency contacts.
          </Text>
        </View>

        {/* Privacy */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <Text style={styles.text}>
            Your privacy is our priority. We only collect essential data needed
            for safety features. Your location is never shared without your
            explicit consent, and all communications are encrypted. Emergency
            contacts only receive alerts when you activate them.
          </Text>
        </View>

        {/* Team & Contact */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.text}>
            Have questions, feedback, or need support? We'd love to hear from
            you!
          </Text>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => openLink("mailto:support@serenade.com")}
          >
            <Text style={styles.contactButtonText}>📧 support@serenade.com</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => openLink("https://serenade.com")}
          >
            <Text style={styles.contactButtonText}>🌐 www.serenade.com</Text>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <TouchableOpacity onPress={() => openLink("https://serenade.com/terms")}>
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLink("https://serenade.com/privacy")}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Credits */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.sectionTitle}>Acknowledgments</Text>
          <Text style={styles.text}>
            • OpenStreetMap Contributors{"\n"}
            • Expo & React Native Community{"\n"}
            • Women's Safety Organizations in Nepal{"\n"}
            • All our beta testers and supporters
          </Text>
        </View>

        <Text style={styles.footer}>
          Made with ❤️ for Women's Safety in Nepal
        </Text>

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
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: "center",
    fontWeight: theme.fontWeights.semi,
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
  },
  featureText: {
    flex: 1,
  },
  featureName: {
    fontSize: 15,
    fontWeight: theme.fontWeights.semi,
    color: theme.colors.text,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  contactButton: {
    backgroundColor: theme.colors.primary + "20",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  contactButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: theme.fontWeights.semi,
    textAlign: "center",
  },
  linkText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginVertical: 8,
    textDecorationLine: "underline",
  },
  footer: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 24,
    fontStyle: "italic",
  },
});
