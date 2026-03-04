import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from "react-native";
import { PageHeader } from "../components/PageHeader.js";
import { theme } from "../theme.js";
import { setStoredItem, clearStoredData } from "../services/storage.js";

export default function PrivacySecurityPage({ navigation }: any) {
  const [dataSharing, setDataSharing] = useState(false);
  const [locationTracking, setLocationTracking] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [biometricLock, setBiometricLock] = useState(false);

  const handleDataSharingToggle = async (value: boolean) => {
    setDataSharing(value);
    await setStoredItem("data_sharing", value.toString());
    Alert.alert(
      "Data Sharing",
      value ? "Data sharing enabled" : "Data sharing disabled"
    );
  };

  const handleLocationToggle = async (value: boolean) => {
    setLocationTracking(value);
    await setStoredItem("location_tracking", value.toString());
    Alert.alert(
      "Location Tracking",
      value
        ? "Location tracking enabled for safety features"
        : "Location tracking disabled. Some features may not work properly."
    );
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all your local data including saved preferences. This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearStoredData();
              Alert.alert("Success", "All local data has been cleared");
            } catch (error) {
              Alert.alert("Error", "Failed to clear data");
            }
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      "Export Data",
      "Your data export will be prepared and sent to your registered email address.",
      [{ text: "OK" }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirm Deletion",
              "Please contact support to confirm account deletion.",
              [{ text: "OK" }]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Privacy & Security"
        subtitle="Manage your data and privacy"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Privacy Settings */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.cardTitle}>🔒 Privacy Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingText}>Data Sharing</Text>
              <Text style={styles.settingDesc}>
                Share anonymous usage data to improve app
              </Text>
            </View>
            <Switch
              value={dataSharing}
              onValueChange={handleDataSharingToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingText}>Location Tracking</Text>
              <Text style={styles.settingDesc}>Required for safety features</Text>
            </View>
            <Switch
              value={locationTracking}
              onValueChange={handleLocationToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingText}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Receive emergency alerts</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>
        </View>

        {/* Security Settings */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.cardTitle}>🛡️ Security Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingText}>Biometric Lock</Text>
              <Text style={styles.settingDesc}>
                Use fingerprint/face to unlock app
              </Text>
            </View>
            <Switch
              value={biometricLock}
              onValueChange={setBiometricLock}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              Alert.alert(
                "Change Password",
                "Password change functionality coming soon"
              )
            }
          >
            <Text style={styles.actionButtonText}>Change Password</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Data Management */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.cardTitle}>📊 Data Management</Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
            <Text style={styles.actionButtonText}>Export My Data</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleClearData}>
            <Text style={[styles.actionButtonText, { color: theme.colors.warning }]}>
              Clear Local Data
            </Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.cardTitle}>⚠️ Danger Zone</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.danger }]}>
              Delete Account
            </Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Information */}
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.cardTitle}>ℹ️ Information</Text>
          <Text style={styles.infoText}>
            • Your location data is only used for safety features
          </Text>
          <Text style={styles.infoText}>
            • Emergency contacts can see your location when you send an alert
          </Text>
          <Text style={styles.infoText}>
            • We never sell your personal information
          </Text>
          <Text style={styles.infoText}>
            • End-to-end encryption for sensitive data
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  scroll: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: theme.colors.danger + "40",
  },
  cardTitle: {
    fontWeight: theme.fontWeights.semi,
    fontSize: 15,
    marginBottom: 12,
    color: theme.colors.text,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  actionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  arrow: {
    fontSize: 18,
    color: theme.colors.textMuted,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
});
