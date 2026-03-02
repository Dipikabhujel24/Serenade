import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLiveLocation } from '../services/locationService';
import { getNearbyHospitals, getNearbyPoliceStations } from '../services/places';

function openDirections(lat: number, lon: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
  Linking.openURL(url).catch(() => {});
}

export default function NearbyHelp({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [police, setPolice] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const loc = await getLiveLocation();
        const lat = loc.latitude;
        const lon = loc.longitude;

        const [h, p] = await Promise.all([
          getNearbyHospitals(lat, lon).catch((e) => { console.warn('hosp error', e); return []; }),
          getNearbyPoliceStations(lat, lon).catch((e) => { console.warn('police error', e); return []; }),
        ]);

        setHospitals(h || []);
        setPolice(p || []);
      } catch (e: any) {
        console.warn('NearbyHelp load failed', e);
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TouchableOpacity style={styles.header} onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
          <Text style={styles.headerText}>Nearby Help</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={{ padding: 12 }}>
            <Text style={{ color: 'red' }}>Failed to load nearby places: {error}</Text>
            <Text style={{ marginTop: 8, color: '#6B7280' }}>Set your Google Places API key in AsyncStorage under key `google_places_api_key`.</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Hospitals</Text>
            {hospitals.length === 0 ? (
              <Text style={styles.empty}>No hospitals found nearby.</Text>
            ) : hospitals.map((h: any) => (
              <TouchableOpacity key={h.place_id} style={styles.item} onPress={() => {
                const loc = h.geometry?.location;
                if (loc) openDirections(loc.lat, loc.lng);
              }}>
                <Text style={styles.itemTitle}>{h.name}</Text>
                <Text style={styles.itemSub}>{h.vicinity || h.formatted_address}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Police Stations</Text>
            {police.length === 0 ? (
              <Text style={styles.empty}>No police stations found nearby.</Text>
            ) : police.map((p: any) => (
              <TouchableOpacity key={p.place_id} style={styles.item} onPress={() => {
                const loc = p.geometry?.location;
                if (loc) openDirections(loc.lat, loc.lng);
              }}>
                <Text style={styles.itemTitle}>{p.name}</Text>
                <Text style={styles.itemSub}>{p.vicinity || p.formatted_address}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5FF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  back: { fontSize: 18, marginRight: 8 },
  headerText: { fontWeight: '700', fontSize: 18 },
  sectionTitle: { fontWeight: '800', marginTop: 12, marginBottom: 8 },
  empty: { color: '#6B7280', marginBottom: 8 },
  item: { backgroundColor: '#FFF', padding: 12, borderRadius: 10, marginBottom: 10 },
  itemTitle: { fontWeight: '700' },
  itemSub: { color: '#6B7280', marginTop: 6 },
});
