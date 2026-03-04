import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator.js";
import { signupUser } from "../services/api.js";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export default function SignupPage({ navigation }: Props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const handleSignup = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      await signupUser(username, email, password);
      Alert.alert("Success", "Account created successfully");
      navigation.replace("Dashboard");
    } catch (err: any) {
      Alert.alert("Signup Failed", err?.message || "An error occurred");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Sign Up</Text>
      <Text style={styles.subHeading}>Sign up to Continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {/* Sign Up Button */}
      <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
        <Text style={styles.signupText}>Sign Up</Text>
      </TouchableOpacity>

      {/* Remember Me */}
      <View style={styles.rememberRow}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            remember && { backgroundColor: "#FF4FD8" },
          ]}
          onPress={() => setRemember(!remember)}
        />
        <Text style={styles.rememberText}>Remember Me</Text>
      </View>

      {/* Login Link */}
      <Text style={styles.loginText}>
        Already have an account?{" "}
        <Text
          style={styles.loginLink}
          onPress={() => navigation.navigate("Login")}
        >
          Login In
        </Text>
      </Text>

      {/* Divider */}
      <Text style={styles.divider}>-------------- Or --------------</Text>

      {/* Google Button */}
      <TouchableOpacity
        style={styles.googleButton}
        onPress={() => Alert.alert("Google Login", "Coming Soon")}
      >
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F99AFB",
    padding: 24,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: "center",
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subHeading: {
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 25,
    marginVertical: 8,
  },
  signupButton: {
    backgroundColor: "#FF4FD8",
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 20,
    alignItems: "center",
  },
  signupText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#000",
    marginRight: 8,
  },
  rememberText: {
    fontSize: 14,
  },
  loginText: {
    marginTop: 14,
    textAlign: "center",
  },
  loginLink: {
    color: "blue",
    fontWeight: "600",
  },
  divider: {
    textAlign: "center",
    marginVertical: 20,
    color: "#333",
  },
  googleButton: {
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
  },
  googleText: {
    fontWeight: "600",
  },
});
