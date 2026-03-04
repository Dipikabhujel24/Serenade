import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { playRecordedVoice } from "../services/audioServices.js";

export default function FakeCall({ navigation }: any) {

  const handleAccept = async () => {
    try {
      await playRecordedVoice();
    } catch (err) {
      console.log("Voice playback failed:", err);
    }
  };

  const handleReject = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>

      {/* Caller Info */}
      <View style={styles.callerSection}>
        <Text style={styles.callerName}>Mom</Text>
        <Text style={styles.callerType}>mobile</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>

        {/* Decline */}
        <TouchableOpacity style={styles.declineWrapper} onPress={handleReject}>
          <View style={[styles.circle, styles.decline]}>
            <Text style={styles.icon}>✕</Text>
          </View>
          <Text style={styles.label}>Decline</Text>
        </TouchableOpacity>

        {/* Accept */}
        <TouchableOpacity style={styles.acceptWrapper} onPress={handleAccept}>
          <View style={[styles.circle, styles.accept]}>
            <Text style={styles.icon}>✓</Text>
          </View>
          <Text style={styles.label}>Accept</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "space-between",
    paddingVertical: 120,
  },

  callerSection: {
    alignItems: "center",
  },

  callerName: {
    color: "#FFF",
    fontSize: 42,
    fontWeight: "600",
  },

  callerType: {
    color: "#bbb",
    fontSize: 18,
    marginTop: 6,
  },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 40,
  },

  declineWrapper: {
    alignItems: "center",
  },

  acceptWrapper: {
    alignItems: "center",
  },

  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  decline: {
    backgroundColor: "#ff3b30",
  },

  accept: {
    backgroundColor: "#34c759",
  },

  icon: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "bold",
  },

  label: {
    color: "#FFF",
    marginTop: 10,
    fontSize: 16,
  },
});