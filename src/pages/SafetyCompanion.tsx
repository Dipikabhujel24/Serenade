import React, { useState } from "react";
import useLocationTracker from "../hooks/useLocationTracker";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";

export default function SafetyCompanion({ navigation }: any) {
  const [enabled, setEnabled] = useState(false);
  const [companion] = useState("Best Friend");
  const { start, stop } = useLocationTracker();

  const toggleCompanion = () => {
    const newVal = !enabled;
    setEnabled(newVal);

    if (newVal) start();
    else stop();

    Alert.alert(
      "Safety Companion",
      newVal ? "Safety Companion Mode Activated" : "Safety Companion Mode Deactivated"
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.back}>←</Text>
        <Text style={styles.headerText}>Safety Companion</Text>
      </TouchableOpacity>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.title}>
          Safety Companion Mode
        </Text>

        <Text style={styles.desc}>
          Your trusted companion will be notified during
          emergencies.
        </Text>

        <View style={styles.row}>
          <Text>Enable Mode</Text>
          <Switch value={enabled} onValueChange={toggleCompanion} />
        </View>

        <View style={styles.companionBox}>
          <Text style={styles.label}>Selected Companion</Text>
          <Text style={styles.value}>👤 {companion}</Text>
        </View>

        <TouchableOpacity
          style={styles.testBtn}
          onPress={() =>
            Alert.alert(
              "Companion Alert",
              "Companion has been notified (demo)"
            )
          }
        >
          <Text style={styles.testText}>
            Test Companion Alert
          </Text>
        </TouchableOpacity>
      </View>
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
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  desc: {
    fontSize: 12,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  companionBox: {
    backgroundColor: "#FFE1F5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontWeight: "700",
  },
  testBtn: {
    backgroundColor: "#FF4FD8",
    padding: 14,
    borderRadius: 20,
    alignItems: "center",
  },
  testText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
