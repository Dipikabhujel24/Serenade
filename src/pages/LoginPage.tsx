import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { setStoredItem } from "../services/storage.js";
import { loginUser } from "../services/api.js"; 

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter all fields");
      return;
    }

    try {
      const data = await loginUser(username, password);

      // ✅ Save token + username
      await setStoredItem("accessToken", data.access);
      await setStoredItem("username", data.username);

      // ✅ Navigate to dashboard
      navigation.replace("Dashboard");
    } catch (error: any) {
      if (error && error.suppressAlert) {
        // Network unavailable or timeout — log but don't show a blocking alert
        console.warn("Login suppressed error:", error.message || error);
        return;
      }
      Alert.alert("Login Failed", error.message || String(error));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>

      <TextInput
        placeholder="Username"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>

      <Text style={styles.link}>
        Don’t have an account?{" "}
        <Text
          style={styles.linkText}
          onPress={() => navigation.navigate("Signup")}
        >
          Sign Up
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F99AFB",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 30,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#FF4FD8",
    padding: 15,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    marginTop: 20,
  },
  linkText: {
    color: "#0066FF",
    fontWeight: "700",
  },
});
