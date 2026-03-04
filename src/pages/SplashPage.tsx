import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator.js";

type Props = NativeStackScreenProps<AuthStackParamList, "Splash">;

const { width, height } = Dimensions.get("window");

export default function SplashPage({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={["#FF2FCF", "#A855F7", "#6366F1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo Circle */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={["#FFFFFF", "#F8F9FA"]}
            style={styles.circle}
          >
            <Text style={styles.logoText}>SERENADE</Text>
            <View style={styles.divider} />
            <Text style={styles.tagline}>Strength in every step</Text>
          </LinearGradient>
        </View>

        {/* Welcome Text */}
        <View style={styles.textContainer}>
          <Text style={styles.welcomeText}>WELCOME TO</Text>
          <Text style={styles.appName}>SERENADE</Text>
          <Text style={styles.subtitle}>
            Begin your journey to wellness and vitality
          </Text>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={() => navigation.navigate("Signup")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#FFFFFF", "#F3F4F6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  decorCircle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: -100,
    right: -100,
  },

  decorCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    bottom: 100,
    left: -50,
  },

  decorCircle3: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    top: height * 0.3,
    left: width * 0.7,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 30,
    paddingVertical: 60,
  },

  logoContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  circle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  logoText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#6366F1",
    letterSpacing: 2,
  },

  divider: {
    width: 60,
    height: 3,
    backgroundColor: "#A855F7",
    marginVertical: 12,
    borderRadius: 2,
  },

  tagline: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    fontStyle: "italic",
  },

  textContainer: {
    alignItems: "center",
    gap: 8,
  },

  welcomeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 3,
  },

  appName: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "400",
    lineHeight: 22,
  },

  buttonWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  button: {
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    minWidth: 200,
    alignItems: "center",
  },

  buttonText: {
    color: "#6366F1",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});