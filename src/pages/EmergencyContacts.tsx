import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Contact = {
  id: string;
  name: string;
  phone: string;
};

export default function EmergencyContacts() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);

  /* ================= LOAD CONTACTS ================= */
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    const stored = await AsyncStorage.getItem("emergency_contacts");
    if (stored) setContacts(JSON.parse(stored));
  };

  const saveContacts = async (data: Contact[]) => {
    await AsyncStorage.setItem(
      "emergency_contacts",
      JSON.stringify(data)
    );
  };

  /* ================= ADD CONTACT ================= */
  const addContact = async () => {
    if (!name || !phone) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    const newContact: Contact = {
      id: Date.now().toString(),
      name,
      phone,
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    saveContacts(updated);

    setName("");
    setPhone("");
  };

  /* ================= DELETE CONTACT ================= */
  const deleteContact = (id: string) => {
    Alert.alert("Delete Contact", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const updated = contacts.filter(c => c.id !== id);
          setContacts(updated);
          saveContacts(updated);
        },
      },
    ]);
  };

  /* ================= UI ================= */
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Contacts</Text>

      <TextInput
        placeholder="Contact Name"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder="Phone Number"
        style={styles.input}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <TouchableOpacity style={styles.addButton} onPress={addContact}>
        <Text style={styles.addText}>Add Contact</Text>
      </TouchableOpacity>

      <FlatList
        data={contacts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.contactCard}>
            <View>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text>{item.phone}</Text>
            </View>

            <TouchableOpacity onPress={() => deleteContact(item.id)}>
              <Text style={styles.delete}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F99AFB",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 25,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: "#FF4FD8",
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 20,
  },
  addText: {
    color: "#FFF",
    fontWeight: "700",
  },
  contactCard: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactName: {
    fontWeight: "700",
  },
  delete: {
    fontSize: 18,
  },
});
