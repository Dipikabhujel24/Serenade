import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLiveLocation } from "../services/locationService";
import { sendLocation, sosAlert } from "../services/api";

export default function Dashboard({ navigation }: any) {
  /* ================= USER ================= */
  const [username, setUsername] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const name = await AsyncStorage.getItem("username");
        if (name) setUsername(name);
      } catch (e) {
        console.log("Failed to load username");
      }
    };
    loadUser();
  }, []);

  /* ================= SOS ================= */
  const handleSOS = () => {
    Alert.alert(
      "Emergency SOS",
      "Are you sure you want to activate Emergency SOS?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "YES",
          onPress: async () => {
            try {
              setStatus("Preparing SOS...");
              // Try to get current location but don't block if it fails
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
              }

              const resp = await sosAlert(payload);
              console.log("sos response", resp);
              setStatus("SOS sent");
              Alert.alert("SOS Activated", "Emergency alert has been sent successfully");
            } catch (err: any) {
              console.error("Failed to send SOS", err);
              setStatus("SOS failed");
              Alert.alert("SOS Failed", err?.message || String(err));
            }
          },
        },
      ]
    );
  };

  /* ================= Live Location ================= */
  const handleLiveLocation = async () => {
    try {
      console.log("LiveLocation: start");
      setStatus("Requesting location permission...");
      const location = await getLiveLocation();
      console.log("LiveLocation: got", location);
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ================= Header ================= */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning</Text>
          <Text style={styles.username}>{username}</Text>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Notification")}
          >
            <Text style={styles.icon}>🔔</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
          >
            <Text style={styles.icon}>⚙️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Menu")}
          >
            <Text style={styles.icon}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {status ? (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : null}

      {/* ================= Battery Status ================= */}
      <View style={styles.batteryCard}>
        <View>
          <Text style={styles.cardTitle}>🔋 Battery Status</Text>
          <Text style={styles.cardSub}>Auto Alert at 15%</Text>
        </View>
        <Text style={styles.batteryPercent}>80%</Text>
      </View>

      {/* ================= SOS ================= */}
      <TouchableOpacity style={styles.sosCard} onPress={handleSOS}>
        <View style={styles.sosIcon}>
          <Text style={{ fontSize: 24 }}>🛡️</Text>
        </View>
        <Text style={styles.sosTitle}>Emergency SOS</Text>
        <Text style={styles.sosSub}>
          Tap to activate Emergency Alert
        </Text>
      </TouchableOpacity>

      {/* ================= Quick Actions ================= */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#B56AE0" }]}
          onPress={handleLiveLocation}
        >
          <Text style={styles.actionIcon}>📍</Text>
          <Text style={styles.actionTitle}>Live Location</Text>
          <Text style={styles.actionSub}>Share Location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#9BB7FF" }]}
          onPress={() =>
            Alert.alert("Voice Alert", "Listening for 'Help Me'")
          }
        >
          <Text style={styles.actionIcon}>🎤</Text>
          <Text style={styles.actionTitle}>Voice Alert</Text>
          <Text style={styles.actionSub}>Say “Help Me”</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#FF6AA2" }]}
          onPress={() =>
            Alert.alert(
              "Community Alert",
              "Nearby users notified"
            )
          }
        >
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionTitle}>Community</Text>
          <Text style={styles.actionSub}>Nearby Alert</Text>
        </TouchableOpacity>


        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#FF8A5C" }]}
          onPress={() =>
            Alert.alert(
              "Nearby Help",
              "Showing police & hospitals"
            )
          }
        >
          <Text style={styles.actionIcon}>🏥</Text>
          <Text style={styles.actionTitle}>Nearby Help</Text>
          <Text style={styles.actionSub}>Police & Hospitals</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* ================= Styles ================= */

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F99AFB",
    padding: 16,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 18,
  },
  username: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  icon: {
    fontSize: 20,
  },

  batteryCard: {
    backgroundColor: "#B56AE0",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cardTitle: {
    fontWeight: "700",
  },
  cardSub: {
    fontSize: 12,
  },
  batteryPercent: {
    fontWeight: "700",
    fontSize: 18,
  },

  statusRow: {
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  statusText: {
    color: "#333",
  },

  sosCard: {
    backgroundColor: "#FF4FD8",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  sosIcon: {
    backgroundColor: "#FFF",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  sosTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  sosSub: {
    fontSize: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  actionCard: {
    width: "48%",
    borderRadius: 18,
    padding: 16,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  actionTitle: {
    fontWeight: "700",
  },
  actionSub: {
    fontSize: 12,
  },
});
