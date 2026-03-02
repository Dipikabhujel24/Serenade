import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAlertHistory } from '../services/api';

const PAGE_SIZE = 10;

export default function AlertHistory() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAlertHistory();
      setAlerts(Array.isArray(data) ? data : []);
      setPage(0);
    } catch (e: any) {
      console.warn('AlertHistory: failed to load', e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const pageData = alerts.slice(0, (page + 1) * PAGE_SIZE);

  const renderItem = ({ item }: { item: any }) => {
    const time = new Date(item.created_at || item.timestamp || item.date || Date.now());
    const label = item.message || item.alert_type || 'Alert';
    const lat = item.latitude;
    const lon = item.longitude;

    return (
      <TouchableOpacity style={styles.card} onPress={() => { /* expand later */ }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.time}>{time.toLocaleString()}</Text>
        </View>
        {item.message ? <Text style={styles.message}>{item.message}</Text> : null}
        {lat != null && lon != null ? (
          <TouchableOpacity onPress={() => {
            const url = `https://maps.google.com/?q=${lat},${lon}`;
            Linking.openURL(url).catch(() => {});
          }}>
            <Text style={styles.location}>View location • {lat.toFixed(5)}, {lon.toFixed(5)}</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alert History</Text>
      </View>
      {loading ? (
        <View style={{ padding: 20 }}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: 'red' }}>Failed to load: {error}</Text>
        </View>
      ) : (
        <FlatList
          data={pageData}
          keyExtractor={(item) => String(item.id) + (item.created_at || item.timestamp || '')}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={() => (
            alerts.length > pageData.length ? (
              <TouchableOpacity style={styles.loadMore} onPress={() => setPage((p) => p + 1)}>
                <Text style={{ color: '#2563EB' }}>Load more</Text>
              </TouchableOpacity>
            ) : null
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5FF' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12 },
  title: { fontWeight: '700', color: '#111827' },
  time: { color: '#6B7280', fontSize: 12 },
  message: { color: '#374151', marginTop: 8 },
  location: { color: '#2563EB', marginTop: 8 },
  loadMore: { padding: 12, alignItems: 'center' },
});
