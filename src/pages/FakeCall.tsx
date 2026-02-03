import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function FakeCall({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.caller}>Mom</Text>
      <Text style={styles.incoming}>Incoming Call...</Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.reject]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.accept]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.btnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  caller: {
    color: "#FFF",
    fontSize: 36,
    fontWeight: "700",
  },
  incoming: {
    color: "#AAA",
    fontSize: 18,
    marginTop: 10,
  },
  buttons: {
    flexDirection: "row",
    marginTop: 60,
    gap: 40,
  },
  btn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  accept: {
    backgroundColor: "green",
  },
  reject: {
    backgroundColor: "red",
  },
  btnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
