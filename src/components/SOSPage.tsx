import React from "react";
import { TouchableOpacity, Text, StyleSheet, Alert } from "react-native";
import { sosAlert, sendLocation } from "../services/api";
import { getLiveLocation } from "../services/locationService";

export default function SOSPage() {
  const sendSos = async () => {
    try {
      // try to capture live location and send along
      let payload: any = { timestamp: new Date().toISOString() };
      try {
        const loc = await getLiveLocation();
        payload.latitude = loc.latitude;
        payload.longitude = loc.longitude;
        // also post a location update separately for live tracking
        sendLocation({ latitude: loc.latitude, longitude: loc.longitude }).catch(() => {});
      } catch (e) {
        // ignore location errors — still send SOS
      }

      const res = await sosAlert(payload);
      Alert.alert("SOS Activated", res.message || "Emergency alert sent");
    } catch (err: any) {
      Alert.alert("SOS Failed", err?.message || "Could not send SOS");
    }
  };

  const handleSOS = () => {
    Alert.alert(
      "Emergency SOS",
      "Are you sure you want to send an emergency alert?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "YES",
          onPress: sendSos,
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.sos} onPress={handleSOS}>
      <Text style={styles.text}>SOS</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sos: {
    backgroundColor: "red",
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginVertical: 20,
    elevation: 5,
  },
  text: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "bold",
  },
});
