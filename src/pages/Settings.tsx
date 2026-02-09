import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Switch,
} from "react-native";

export default function Settings({ navigation }: any) {
  /* ================= Emergency Contacts ================= */
  const [contacts, setContacts] = useState<string[]>([
    "Contact 1",
    "Contact 2",
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newContact, setNewContact] = useState("");

  const addContact = () => {
    if (newContact.trim() === "") return;
    setContacts([...contacts, newContact.trim()]);
    setNewContact("");
    setModalVisible(false);
  };

  const removeContact = (index: number) => {
    Alert.alert(
      "Delete Contact",
      "Are you sure you want to delete this contact?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updated = [...contacts];
            updated.splice(index, 1);
            setContacts(updated);
          },
        },
      ]
    );
  };

  /* ================= Low Battery Alert ================= */
  const [batteryAlertEnabled, setBatteryAlertEnabled] =
    useState(true);
  const batteryThreshold = 15;

  /* ================= App Settings Handler ================= */
  const handleAppSetting = (item: string) => {
    if (item === "Notification") {
      navigation.navigate("Notifications");
    } else {
      Alert.alert(item, `${item} settings opened`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.back}>←</Text>
        <Text style={styles.headerText}>
          Manage Your Setting Preference
        </Text>
      </TouchableOpacity>

      {/* ================= Emergency Contacts ================= */}
      <View style={styles.cardPink}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            Emergency Contacts
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addIcon}>➕</Text>
          </TouchableOpacity>
        </View>

        {contacts.map((contact, index) => (
          <View key={index} style={styles.contact}>
            <Text>👤 {contact}</Text>
            <TouchableOpacity
              onPress={() => removeContact(index)}
            >
              <Text>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}
      
      </View>

      {/* ================= Low Battery Alert ================= */}
      <View style={styles.cardWhite}>
        <Text style={styles.cardTitle}>
          🔋 Low Battery Alert
        </Text>
        <Text style={styles.sub}>
          Automatically send your location when battery drops
          below threshold
        </Text>

        <View style={styles.row}>
          <Text>Enable Alert</Text>
          <Switch
            value={batteryAlertEnabled}
            onValueChange={setBatteryAlertEnabled}
          />
        </View>

        <Text style={styles.label}>
          Alert Threshold: {batteryThreshold}%
        </Text>
        <View style={styles.fakeSlider} />

        <Text style={styles.sub}>Current Battery: 85%</Text>
      </View>

      {/* ================= App Settings ================= */}
      <View style={styles.cardWhite}>
        <Text style={styles.cardTitle}>⚙️ App Settings</Text>

        {[
          "Notification",
          "Privacy & Security",
          "Language",
          "About",
          "Help",
        ].map((item) => (
          <TouchableOpacity
            key={item}
            style={styles.settingRow}
            onPress={() => handleAppSetting(item)}
          >
            <Text>{item}</Text>
            <Text>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ================= Add Contact Modal ================= */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text
              style={{ fontWeight: "700", marginBottom: 10 }}
            >
              Add Emergency Contact
            </Text>

            <TextInput
              placeholder="Enter contact name"
              value={newContact}
              onChangeText={setNewContact}
              style={styles.input}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={addContact}
              >
                <Text style={{ color: "#FFF" }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: "#FF4FD8",
    borderRadius: 30,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  back: { fontSize: 18, marginRight: 10 },
  headerText: { fontWeight: "700" },

  cardPink: {
    backgroundColor: "#FF7BE5",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  cardWhite: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: "700",
    marginBottom: 6,
  },
  addIcon: { fontSize: 18 },

  contact: {
    backgroundColor: "#FFE1F5",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  sub: { fontSize: 12, marginBottom: 6 },
  label: { fontSize: 12, marginTop: 10 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },

  fakeSlider: {
    height: 6,
    backgroundColor: "#FF4FD8",
    borderRadius: 4,
    marginVertical: 6,
  },

  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: "#DDD",
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    width: "80%",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  addBtn: {
    backgroundColor: "#FF4FD8",
    padding: 10,
    borderRadius: 10,
  },
});
