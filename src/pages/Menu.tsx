import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

export default function Menu({ navigation }: any) {
  type MenuItemProps = {
  title: string;
  screen?: string;
  onPress?: () => void;
};

const MenuItem = ({ title, screen, onPress }: MenuItemProps) => (
  <TouchableOpacity
    style={styles.item}
    onPress={
      onPress
        ? onPress
        : screen
        ? () => navigation.navigate(screen)
        : undefined
    }
  >
    <Text>{title}</Text>
    <Text>›</Text>
  </TouchableOpacity>
);

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.back}>←</Text>
        <Text style={styles.headerText}>Menu</Text>
      </TouchableOpacity>

      {/* Menu Options */}
      <View style={styles.card}>
        <MenuItem title="👤 Profile" screen="Profile" />
        <MenuItem title="⚙️ Settings" screen="Settings" />
        <MenuItem title="📞 Fake Call" screen="FakeCall" />
        <MenuItem title="🧭 Safety Companion" onPress={() => navigation.navigate("SafetyCompanion")}
       />

        <MenuItem title="🚨 Emergency Contacts" />
        <MenuItem title="ℹ️ About App" />
        <MenuItem title="❓ Help" />
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logout}
        onPress={() => navigation.replace("Login")}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F99AFB",
    padding: 16,
  },
  header: {
    backgroundColor: "#FF4FD8",
    borderRadius: 30,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  back: {
    fontSize: 18,
    marginRight: 10,
  },
  headerText: {
    fontWeight: "700",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: "#DDD",
  },
  itemText: {
    fontSize: 16,
  },
  arrow: {
    fontSize: 18,
    color: "#999",
  },
  logout: {
    backgroundColor: "#FF4FD8",
    padding: 16,
    borderRadius: 30,
    marginTop: 30,
    alignItems: "center",
  },
  logoutText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
