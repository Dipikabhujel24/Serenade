import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { connectRealtime, disconnectRealtime, onRealtime } from "../services/realtime";

export default function Notifications({ navigation }: any) {
  const [items, setItems] = useState<Array<{title:string;desc:string}>>([]);

  useEffect(() => {
    connectRealtime();
    const unsub = onRealtime((data) => {
      try {
        const t = (data.type || data.alert_type || 'Alert').toString();
        const msg = data.message || data.text || JSON.stringify(data);

        // Show an immediate small alert for SOS (optional)
        if (t === 'sos' || t === 'sos_alert' || t === 'alert') {
          Alert.alert('SOS Received', msg, [{ text: 'OK' }], { cancelable: true });
        }

        // Prepend with readable title/desc
        const title = t === 'community' || t === 'community_alert' ? 'Community Alert' : t === 'safety_companion' || t === 'companion' ? 'Companion Alert' : (t || 'Alert');
        setItems((s) => [{ title, desc: msg, raw: data }, ...s].slice(0, 50));
      } catch (e) {
        console.warn('Realtime handler error', e);
      }
    });

    return () => {
      unsub();
      disconnectRealtime();
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.back}>←</Text>
        <Text style={styles.headerText}>Notifications</Text>
      </TouchableOpacity>

      {items.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.title}>No realtime notifications yet</Text>
          <Text style={styles.desc}>You'll see alerts here as they arrive.</Text>
        </View>
      )}

      {items.map((it, index) => (
        <TouchableOpacity key={index} style={styles.card} onPress={() => {
          // Try to open location if present in raw payload
          const raw = (it as any).raw;
          const lat = raw?.latitude || raw?.lat;
          const lon = raw?.longitude || raw?.lon;
          if (lat != null && lon != null) {
            const url = `https://maps.google.com/?q=${lat},${lon}`;
            Linking.openURL(url).catch(() => {});
            return;
          }
          // Navigate to AlertHistory or show details
          Alert.alert(it.title, it.desc);
        }}>
          <Text style={styles.title}>{it.title}</Text>
          <Text style={styles.desc}>{it.desc}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#F99AFB", padding: 16 },
  header: {
    backgroundColor: "#FF4FD8",
    borderRadius: 30,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  back: { fontSize: 18, marginRight: 10 },
  headerText: { fontWeight: "700" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  title: { fontWeight: "700" },
  desc: { fontSize: 12 },
});
