import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Splash">;

export default function SplashPage({ navigation }: Props) {
  return (
    <View style={styles.container}>
      {/* Top diagonal pink section */}
      <View style={styles.topShape} />

      {/* Text */}
      <Text style={styles.title}>WELCOME</Text>
      <Text style={styles.title}>TO</Text>
      <Text style={styles.title}>SERENADE</Text>

      {/* White circle logo placeholder */}
      <View style={styles.circle}>
        <Text style={styles.logoText}>SERENADE</Text>
        <Text style={styles.tagline}>Strength in every step</Text>
      </View>

      {/* Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Signup")}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F99AFB",
    alignItems: "center",
    justifyContent: "center",
  },

  topShape: {
    position: "absolute",
    top: -40,
    width: "120%",
    height: 180,
    backgroundColor: "#FF2FCF",
    transform: [{ skewY: "-12deg" }],
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#000",
    marginTop: 6,
  },

  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 30,
    elevation: 4,
  },

  logoText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },

  tagline: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
  },

  button: {
    backgroundColor: "#FF4FD8",
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 30,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
