import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { connectRealtime, disconnectRealtime, onRealtime } from "../services/realtime";

export default function Notifications({ navigation }: any) {
  const [items, setItems] = useState<Array<{title:string;desc:string}>>([]);

  useEffect(() => {
    connectRealtime();
    const unsub = onRealtime((data) => {
      // prepend
      setItems((s) => [{ title: data.type || "Alert", desc: data.message || JSON.stringify(data) }, ...s].slice(0,50));
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
        <View key={index} style={styles.card}>
          <Text style={styles.title}>{it.title}</Text>
          <Text style={styles.desc}>{it.desc}</Text>
        </View>
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
