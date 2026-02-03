import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export default function Profile({ navigation }: any) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header with Back Arrow */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Text style={styles.headerSub}>
            Manage your Personal Information
          </Text>
        </View>
      </View>

      {/* Avatar Card */}
      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text>User{"\n"}Avatar</Text>
        </View>
        <Text style={styles.email}>abc@gmail.com</Text>

        <TouchableOpacity style={styles.editBtn}>
          <Text>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Personal Info */}
      <Text style={styles.sectionTitle}>
        Personal Information
      </Text>

      {[
        "User Full Name",
        "Email Address",
        "Phone Number",
        "Address",
      ].map((item) => (
        <View key={item} style={styles.input}>
          <Text>{item}</Text>
        </View>
      ))}

      {/* Emergency Contact */}
      <View style={styles.emergencyCard}>
        <Text style={styles.emergencyTitle}>
          Emergency Contact
        </Text>

        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => navigation.navigate("Settings")}
        >
          <Text>Manage Contacts ➜</Text>
        </TouchableOpacity>
      </View>

      {/* Account Settings */}
      <View style={styles.accountCard}>
        {[
          "🔒 Privacy Security",
          "👤 Account Verification",
          "❤️ Trusted Circle",
        ].map((item) => (
          <TouchableOpacity key={item} style={styles.row}>
            <Text>{item}</Text>
            <Text>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F99AFB",
    padding: 16,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backArrow: {
    fontSize: 22,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 12,
  },

  avatarCard: {
    backgroundColor: "#FF6FE9",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    backgroundColor: "#FFF",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  email: {
    marginBottom: 10,
  },
  editBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },

  sectionTitle: {
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },

  emergencyCard: {
    backgroundColor: "#FF4FD8",
    borderRadius: 25,
    padding: 16,
    marginVertical: 20,
  },
  emergencyTitle: {
    fontWeight: "700",
    marginBottom: 10,
  },
  manageBtn: {
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
  },

  accountCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
});
