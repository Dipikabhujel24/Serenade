import React, { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { getRecentLocations } from "../services/api.js";

export default function LiveTracking() {
  const [locations, setLocations] = useState<any[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const poll = async () => {
      try {
        const data = await getRecentLocations(10, 200);
        // data may be an array or wrapped object; normalize
        const list = Array.isArray(data) ? data : (data && (data.data || []));
        if (mounted.current) setLocations(list || []);
      } catch (e) {
        console.warn("Failed to fetch recent locations", e);
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Tracking (recent locations)</Text>
      <FlatList
        data={locations}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.user}>{item.user || "anon"}</Text>
            <Text style={styles.coords}>{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Text>
            <Text style={styles.ts}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#F99AFB" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  row: { backgroundColor: "#FFF", padding: 10, borderRadius: 8, marginBottom: 8 },
  user: { fontWeight: "700" },
  coords: { color: "#333" },
  ts: { color: "#666", fontSize: 12 },
});
