import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from '@react-navigation/native';
import { registerDeviceToken as apiRegisterDevice } from "../services/api.js";

const styles = StyleSheet.create({
  container: { padding: 16 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 6, marginRight: 8 },
  button: { backgroundColor: "#4CAF50", padding: 10, borderRadius: 6 },
  buttonText: { color: "#fff" },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
});

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [deviceToken, setDeviceToken] = useState("");
  const isFocused = useIsFocused();

  async function load() {
    try {
      const token = await AsyncStorage.default.getItem("accessToken");
      const resp = await fetch(`http://127.0.0.1:8000/api/auth/contacts/`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await resp.json();
      if (data && data.data) setContacts(data.data);
    } catch (e) {
      console.warn("Failed to load contacts", e);
    }
  }

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused]);

  async function addContact() {
    try {
      const token = await AsyncStorage.default.getItem("accessToken");
      const resp = await fetch(`http://127.0.0.1:8000/api/auth/contacts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ name, phone, relation }),
      });
      const data = await resp.json();
      if (data && data.status === "success") {
        setName("");
        setPhone("");
        setRelation("");
        load();
      } else {
        Alert.alert("Error", JSON.stringify(data));
      }
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  }

  async function registerToken() {
    try {
      if (!deviceToken) return Alert.alert("Enter device token first");
      const resp = await apiRegisterDevice(deviceToken, "web");
      console.log("register device resp", resp);
      Alert.alert("Registered", "Device token registered");
      setDeviceToken("");
    } catch (e: any) {
      Alert.alert("Error", e?.message || String(e));
    }
  }

  async function removeContact(id: number) {
    try {
      const token = await AsyncStorage.default.getItem("accessToken");
      const resp = await fetch(`http://127.0.0.1:8000/api/auth/contacts/${id}/`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await resp.json();
      if (data && data.status === "success") load();
      else Alert.alert("Error", JSON.stringify(data));
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput placeholder="Name" style={styles.input} value={name} onChangeText={setName} />
      </View>
      <View style={styles.row}>
        <TextInput placeholder="Phone (+E164)" style={styles.input} value={phone} onChangeText={setPhone} />
      </View>
      <View style={styles.row}>
        <TextInput placeholder="Relation" style={styles.input} value={relation} onChangeText={setRelation} />
        <TouchableOpacity style={styles.button} onPress={addContact}>
          <Text style={styles.buttonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={{ marginBottom: 6, fontWeight: "700" }}>Device Token (paste FCM token)</Text>
        <View style={styles.row}>
          <TextInput placeholder="Device token" style={styles.input} value={deviceToken} onChangeText={setDeviceToken} />
          <TouchableOpacity style={styles.button} onPress={registerToken}>
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={{ fontWeight: "700" }}>{item.name || item.phone}</Text>
            <Text>{item.phone}</Text>
            <Text style={{ color: "#666" }}>{item.relation}</Text>
            <TouchableOpacity onPress={() => removeContact(item.id)} style={{ marginTop: 8 }}>
              <Text style={{ color: "#E53935" }}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
