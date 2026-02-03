import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { router } from "expo-router";

export default function Welcome() {
  return (
    <View style={styles.container}>

      <Image
        source={require("../assets/images")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>SERENADE</Text>
      <Text style={styles.subtitle}>Your Safety Companion</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.btnText}>Get Started</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 150,
    height: 150,     
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FF5A8A",
  },
  subtitle: {
    marginVertical: 10,
  },
  button: {
    backgroundColor: "#FF5A8A",
    padding: 15,
    borderRadius: 30,
    width: "70%",
    marginTop: 20,
  },
  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});
