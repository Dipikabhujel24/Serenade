import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function Login() {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 28 }}>Welcome Back</Text>

      <TextInput placeholder="Email" style={input} />
      <TextInput placeholder="Password" secureTextEntry style={input} />

      <TouchableOpacity
        style={button}
        onPress={() => router.replace("/(tabs)/home")}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/signup")}>
        <Text style={{ textAlign: "center", marginTop: 10 }}>
          Create Account
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const input = {
  borderWidth: 1,
  padding: 12,
  marginTop: 15,
  borderRadius: 10,
};

const button = {
  backgroundColor: "#FF5A8A",
  padding: 15,
  marginTop: 25,
  borderRadius: 25,
};
