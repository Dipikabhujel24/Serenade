import React, { useState, useEffect } from "react";
import {
  View,
  Text, 
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { getStoredItem, setStoredItem } from '../services/storage.js';

import { currentHost } from '../services/apiHost.js';

export default function Profile({ navigation }: any) {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [email, setEmail] = useState('abc@gmail.com');

  useEffect(() => {
    (async () => {
      // load known avatar from AsyncStorage if any
      try {
        const a = await getStoredItem('avatar');
        if (a) setAvatarUri(a);
      } catch {}
    })();
  }, []);

  const pickAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Camera permission required');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.6 });
      if (res.canceled) return;
      const uri = res.assets[0].uri;
      setAvatarUri(uri);

      // Upload to server
      const token = await getStoredItem('accessToken');
      const host = currentHost();
      const url = `http://${host}:8000/api/accounts/profile/avatar/`;

      const form = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = filename.match(/\.([0-9a-z]+)$/i);
      const ext = match ? match[1] : 'jpg';
      const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      // @ts-ignore
      form.append('avatar', { uri, name: filename, type: mime });

      const headers: any = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resp = await fetch(url, { method: 'POST', body: form, headers });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => null);
        throw new Error(`Upload failed: ${resp.status} ${txt || resp.statusText}`);
      }
      const data = await resp.json();
      if (data && data.status === 'success' && data.avatar) {
        const avatarUrl = data.avatar.startsWith('http') ? data.avatar : `http://${host}${data.avatar}`;
        setAvatarUri(avatarUrl);
        await setStoredItem('avatar', avatarUrl);
        Alert.alert('Success', 'Profile photo updated');
      } else {
        throw new Error('Upload did not return avatar URL');
      }
    } catch (e: any) {
      console.warn('Avatar upload failed', e);
      Alert.alert('Upload failed', e?.message || String(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header with Back Arrow */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Text style={styles.headerSub}>
            Manage your Personal Information
          </Text>
        </View>
      </View>

      {/* Avatar Card */}
      <View style={styles.avatarCard}>
        <TouchableOpacity onPress={pickAndUpload} style={styles.avatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 80, height: 80, borderRadius: 40 }} />
          ) : (
            <Text>User{"\n"}Avatar</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.email}>{email}</Text>

        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('Profile') }>
          <Text>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Personal Info */}
      <Text style={styles.sectionTitle}>
        Personal Information
      </Text>

      {[
        "User Full Name",
        "Email Address",
        "Phone Number",
        "Address",
      ].map((item) => (
        <View key={item} style={styles.input}>
          <Text>{item}</Text>
        </View>
      ))}

      {/* Emergency Contact */}
      <View style={styles.emergencyCard}>
        <Text style={styles.emergencyTitle}>
          Emergency Contact
        </Text>

        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => navigation.navigate("Settings")}
        >
          <Text>Manage Contacts ➜</Text>
        </TouchableOpacity>
      </View>

      {/* Account Settings */}
      <View style={styles.accountCard}>
        {[
          "🔒 Privacy Security",
          "👤 Account Verification",
          "❤️ Trusted Circle",
        ].map((item) => (
          <TouchableOpacity key={item} style={styles.row}>
            <Text>{item}</Text>
            <Text>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F99AFB",
    padding: 16,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backArrow: {
    fontSize: 22,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 12,
  },

  avatarCard: {
    backgroundColor: "#FF6FE9",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    backgroundColor: "#FFF",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  email: {
    marginBottom: 10,
  },
  editBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },

  sectionTitle: {
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },

  emergencyCard: {
    backgroundColor: "#FF4FD8",
    borderRadius: 25,
    padding: 16,
    marginVertical: 20,
  },
  emergencyTitle: {
    fontWeight: "700",
    marginBottom: 10,
  },
  manageBtn: {
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
  },

  accountCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
});
