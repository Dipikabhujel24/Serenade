import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Image,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLiveLocation } from "../services/locationService";
import { sendLocation, sosAlert, initApiHostFromStorage } from "../services/api";
import { getAlertHistory } from "../services/api";
import { startVoiceMonitor, stopVoiceMonitor } from "../services/voiceAlert";
import { sendSmsToContacts, getStoredEmergencyContacts } from "../services/smsService";
import useShakeDetector from "../hooks/useShakeDetector";

const shadowStyle = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  android: { elevation: 8 },
  default: {},
});

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: { elevation: 4 },
  default: {},
});

export default function Dashboard({ navigation }: any) {
  const [username, setUsername] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [voiceListening, setVoiceListening] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>("");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const name = await AsyncStorage.getItem("username");
        if (name) setUsername(name);
      } catch (e) {
        console.log("Failed to load username");
      }
    };
    const loadPreferences = async () => {
      try {
        await initApiHostFromStorage();
        const v = await AsyncStorage.getItem("voice_monitor_enabled");
        if (v === "true") {
          const started = startVoiceMonitor((s: string) => {
            setVoiceStatus(s);
            setStatus(s.startsWith("triggered") ? "Voice SOS triggered" : s);
          });
          setVoiceListening(Boolean(started));
        }
      } catch (e) {
        console.warn("Failed to load preferences", e);
      }
    };
    loadUser();
    loadPreferences();
    return () => {
      try {
        stopVoiceMonitor();
      } catch {}
    };
  }, []);

  // Shake detection: hidden SOS trigger
  useShakeDetector(async () => {
    try {
      // check if user enabled shake SOS
      const v = await AsyncStorage.getItem("shake_sos_enabled");
      if (v !== "true") return;
      // trigger immediate SOS without confirmation
      sendSosImmediate();
    } catch (e) {
      console.warn("Shake handler error", e);
    }
  });

  const handleSOS = () => {
    Alert.alert(
      "Emergency SOS",
      "Are you sure you want to activate Emergency SOS?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "YES",
                onPress: sendSosImmediate,
        },
      ]
    );
  };

  // sendSosImmediate: extracted logic used for both the confirmation flow and hidden shake trigger
  async function sendSosImmediate() {
    try {
      setStatus("Preparing SOS...");
      let lat: number | null = null;
      let lon: number | null = null;
      try {
        const loc = await getLiveLocation();
        lat = (loc as any).latitude ?? null;
        lon = (loc as any).longitude ?? null;
        setStatus("Location captured");
      } catch (e: any) {
        console.warn("Could not capture location for SOS", e);
        setStatus("Sending SOS without location");
      }

      const payload: any = { alert_type: "sos", message: "Emergency SOS activated" };
      if (lat !== null && lon !== null) {
        payload.latitude = lat;
        payload.longitude = lon;
        try {
          const locAny: any = await getLiveLocation();
          if (locAny.accuracy != null) payload.accuracy = locAny.accuracy;
          if (locAny.timestamp) payload.timestamp = locAny.timestamp;
        } catch (e) {}
      }

      const offlineModeVal = await AsyncStorage.getItem("offline_sms_mode");
      const offlineMode = offlineModeVal === "true";

      let smsSent = false;
      const contacts = await getStoredEmergencyContacts();
      const locationText = lat !== null && lon !== null ? `https://maps.google.com/?q=${lat},${lon}` : "Location unavailable";
      const smsMessage = `Emergency SOS activated. ${locationText}`;

      try {
        const resp = await sosAlert(payload);
        console.log("sos response", resp);
        setStatus("SOS sent");
        Alert.alert("SOS Activated", "Emergency alert has been sent successfully");
        if (offlineMode && contacts.length > 0) {
          try {
            await sendSmsToContacts(contacts, smsMessage);
            smsSent = true;
          } catch (e) {
            console.warn("Failed to send SMS after server SOS", e);
          }
        }
      } catch (err: any) {
        console.error("Failed to send SOS", err);
        setStatus("SOS failed");
        Alert.alert("SOS Failed", err?.message || String(err));
        if (contacts.length > 0) {
          try {
            await sendSmsToContacts(contacts, smsMessage);
            smsSent = true;
            setStatus("SOS sent via SMS");
            Alert.alert("SOS Sent (SMS)", "Emergency SMS has been queued/opened for your contacts.");
          } catch (smsErr) {
            console.error("Failed to send SMS fallback", smsErr);
            Alert.alert("SOS Failed", smsErr?.message || String(smsErr));
          }
        }
      }

      if (!offlineMode && !smsSent) {
        // nothing else
      }
    } catch (err: any) {
      console.error("Failed to send SOS", err);
      setStatus("SOS failed");
      Alert.alert("SOS Failed", err?.message || String(err));
    }
  }

  const handleLiveLocation = async () => {
    try {
      setStatus("Requesting location permission...");
      const location = await getLiveLocation();
      setStatus("Sending location to server...");

      try {
        await sendLocation({ latitude: location.latitude, longitude: location.longitude });
        setStatus("Location shared successfully");
        Alert.alert(
          "Live Location",
          `Shared — Latitude: ${location.latitude}\nLongitude: ${location.longitude}`
        );
      } catch (e: any) {
        console.warn("Failed to send location", e);
        setStatus("Failed to send to server");
        Alert.alert(
          "Live Location (local)",
          `Latitude: ${location.latitude}\nLongitude: ${location.longitude}\n\nFailed to send to server: ${e?.message || e}`
        );
      }
    } catch (error: any) {
      console.warn("Location Error", error);
      setStatus("Location error: " + (error?.message || String(error)));
      Alert.alert("Location Error", error.message || String(error));
    }
  };

  const showSafetyTips = () => {
    Alert.alert(
      "Safety Tips",
      "• Share your live location with trusted contacts\n• Use Fake Call to leave uncomfortable situations\n• Keep emergency contacts updated\n• Trust your instincts – leave if something feels wrong\n• Stay aware of your surroundings"
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const QuickActionButton = ({
    colors,
    icon,
    title,
    subtitle,
    onPress,
  }: {
    colors: [string, string];
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.quickActionCard, cardShadow]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={colors}
        style={styles.quickActionIcon}
      >
        <Text style={styles.quickActionIconText}>{icon}</Text>
      </LinearGradient>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionSub}>{subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={["#F8F5FF", "#FDF2F8", "#F5F0FF"]}
      style={styles.gradientBg}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* ================= Header ================= */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={["#8B5CF6", "#A78BFA"]}
                  style={styles.logoCircle}
                >
                  <Image 
                    source={require('../../assets/images/Logo.png')} 
                    style={styles.logoIcon}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </View>
              <View>
                <Text style={styles.appName}>Serenade</Text>
                <Text style={styles.greeting}>
                  Hello, {username || "there"}
                </Text>
              </View>
            </View>

              <View style={styles.headerIcons}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => navigation.navigate("Notification")}
                >
                  <Text style={styles.icon}>🔔</Text>
                  <View style={styles.notificationBadge} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => navigation.navigate("Menu")}
                >
                  <Text style={styles.icon}>☰</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.headerIconsRight}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={async () => {
                    if (voiceListening) {
                      stopVoiceMonitor();
                      setVoiceListening(false);
                      setVoiceStatus("");
                      try {
                        await AsyncStorage.setItem("voice_monitor_enabled", "false");
                      } catch {}
                    } else {
                      const started = startVoiceMonitor((s: string) => {
                        setVoiceStatus(s);
                        setStatus(s.startsWith("triggered") ? "Voice SOS triggered" : s);
                      });
                      setVoiceListening(Boolean(started));
                      try {
                        await AsyncStorage.setItem("voice_monitor_enabled", started ? "true" : "false");
                      } catch {}
                      if (!started) setVoiceStatus("unsupported");
                    }
                  }}
                >
                  <Text style={styles.icon}>{voiceListening ? "🎙️" : "🎤"}</Text>
                </TouchableOpacity>
              </View>
          </View>

          {status ? (
            <View style={[styles.statusRow, cardShadow]}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          ) : null}

          {/* ================= You Are Safe Card ================= */}
          <LinearGradient
            colors={["#34D399", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.safeCard, shadowStyle]}
          >
            <View style={styles.safeCardContent}>
              <View style={styles.safeCardLeft}>
                <View style={styles.safeDot} />
                <View>
                  <Text style={styles.safeTitle}>You are Safe</Text>
                  <Text style={styles.safeSub}>All systems operational. Stay safe!</Text>
                </View>
              </View>
              <View style={styles.shieldOutline}>
                <Image 
                  source={require('../../assets/images/Logo.png')} 
                  style={styles.shieldIcon}
                  resizeMode="contain"
                />
              </View>
            </View>
          </LinearGradient>

          {/* ================= SOS Button ================= */}
          <TouchableOpacity
            style={styles.sosWrapper}
            onPress={handleSOS}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#EC4899", "#EF4444"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.sosButton, shadowStyle]}
            >
              <View style={styles.sosIconCircle}>
                <Text style={styles.sosExclamation}>!</Text>
              </View>
              <Text style={styles.sosTitle}>SOS</Text>
              <Text style={styles.sosSub}>Press & Hold</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* ================= Quick Actions ================= */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionsGrid}>
            <QuickActionButton
              colors={["#6366F1", "#8B5CF6"]}
              icon="📍"
              title="Share Location"
              subtitle="Live location"
              onPress={handleLiveLocation}
            />
            <QuickActionButton
              colors={["#EC4899", "#F43F5E"]}
              icon="👥"
              title="Find Companion"
              subtitle="Safety buddy"
              onPress={() => navigation.navigate("SafetyCompanion")}
            />
            <QuickActionButton
              colors={["#14B8A6", "#0D9488"]}
              icon="📞"
              title="Fake Call"
              subtitle="Exit situations"
              onPress={() => navigation.navigate("FakeCall")}
            />
            <QuickActionButton
              colors={["#06B6D4", "#0891B2"]}
              icon="🆘"
              title="Nearby Help"
              subtitle="Police & Hospitals"
              onPress={() => navigation.navigate('NearbyHelp')}
            />
            <QuickActionButton
              colors={["#06B6D4", "#0891B2"]}
              icon="📜"
              title="Past Incidents"
              subtitle="View recent alerts"
              onPress={() => navigation.navigate('AlertHistory')}
            />
            <QuickActionButton
              colors={["#F97316", "#EA580C"]}
              icon="💡"
              title="Safety Tips"
              subtitle="Stay prepared"
              onPress={showSafetyTips}
            />
          </View>
          {showHistory ? (
            <View style={{ marginTop: 18 }}>
              <Text style={styles.sectionTitle}>Alert History</Text>
              {historyLoading ? (
                <Text style={{ color: '#6B7280' }}>Loading recent alerts...</Text>
              ) : historyError ? (
                <Text style={{ color: 'red' }}>Failed to load: {historyError}</Text>
              ) : alerts.length === 0 ? (
                <Text style={{ color: '#6B7280' }}>No recent alerts found.</Text>
              ) : (
                alerts.map((a: any) => {
                  const time = new Date(a.created_at || a.timestamp || a.createdAt || a.date);
                  const label = a.message || a.alert_type || 'Alert';
                  const lat = a.latitude;
                  const lon = a.longitude;
                  return (
                    <TouchableOpacity
                      key={String(a.id) + (a.created_at || a.timestamp || '')}
                      style={[styles.quickActionCard, { marginBottom: 10 }]}
                      onPress={() => {
                        if (lat != null && lon != null) {
                          const url = `https://maps.google.com/?q=${lat},${lon}`;
                          Linking.openURL(url).catch(() => {});
                        }
                      }}
                    >
                      <Text style={{ fontWeight: '700', color: '#1F2937' }}>{label}</Text>
                      <Text style={{ color: '#6B7280', marginTop: 6 }}>{time.toLocaleString()}</Text>
                      {lat != null && lon != null ? (
                        <Text style={{ color: '#6B7280', marginTop: 6 }}>Location: {lat.toFixed(5)}, {lon.toFixed(5)}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {},
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  logoIcon: {
    width: 28,
    height: 28,
  },
  appName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: -0.5,
  },
  greeting: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerIconsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    position: "relative",
  },
  icon: {
    fontSize: 22,
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },

  statusRow: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    color: "#374151",
    fontSize: 14,
  },

  safeCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  safeCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  safeCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  safeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFF",
  },
  safeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  safeSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  shieldOutline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  shieldIcon: {
    width: 28,
    height: 28,
  },

  sosWrapper: {
    alignSelf: "center",
    marginBottom: 32,
  },
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  sosIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  sosExclamation: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
  },
  sosTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 2,
  },
  sosSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  quickActionCard: {
    width: "47%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    minHeight: 130,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionIconText: {
    fontSize: 24,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  quickActionSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
});
