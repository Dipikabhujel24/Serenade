import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { PageHeader } from "../components/PageHeader";
import { theme } from "../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", flag: "🇳🇵" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
];

export default function LanguagePage({ navigation }: any) {
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem("app_language");
      if (saved) {
        setSelectedLanguage(saved);
      }
    } catch (error) {
      console.error("Failed to load language preference:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = async (langCode: string) => {
    try {
      await AsyncStorage.setItem("app_language", langCode);
      setSelectedLanguage(langCode);

      const selectedLang = LANGUAGES.find((l) => l.code === langCode);

      Alert.alert(
        "Language Changed",
        `Language changed to ${selectedLang?.name}. The app will update on next restart.`,
        [
          {
            text: "OK",
            onPress: () => {
              // In a real app, you would trigger i18n language change here
              console.log("Language changed to:", langCode);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to save language preference");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Language"
          subtitle="Choose your language"
          onBack={() => navigation.goBack()}
        />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Language"
        subtitle="Choose your language"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.cardTitle}>🌍 Select Language</Text>
          <Text style={styles.subtitle}>
            Choose your preferred language for the app interface
          </Text>

          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageRow,
                selectedLanguage === lang.code && styles.selectedRow,
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.flag}>{lang.flag}</Text>
                <View>
                  <Text style={styles.languageName}>{lang.name}</Text>
                  <Text style={styles.nativeName}>{lang.nativeName}</Text>
                </View>
              </View>
              {selectedLanguage === lang.code && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.cardTitle}>ℹ️ Note</Text>
          <Text style={styles.infoText}>
            • Currently, the app is available in English
          </Text>
          <Text style={styles.infoText}>
            • Nepali and other language translations are coming soon
          </Text>
          <Text style={styles.infoText}>
            • Emergency features work in all languages
          </Text>
          <Text style={styles.infoText}>
            • Your language preference syncs across devices
          </Text>
        </View>

        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.cardTitle}>🤝 Help Us Translate</Text>
          <Text style={styles.infoText}>
            Want to see Serenade in your language? We're looking for volunteers to
            help translate the app.
          </Text>
          <TouchableOpacity
            style={styles.contributeButton}
            onPress={() =>
              Alert.alert(
                "Thank You!",
                "Please contact support@serenade.app to help with translations"
              )
            }
          >
            <Text style={styles.contributeButtonText}>Contribute Translation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  scroll: {
    paddingBottom: 40,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontWeight: theme.fontWeights.semi,
    fontSize: 15,
    marginBottom: 8,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  languageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radii.md,
    marginBottom: 4,
  },
  selectedRow: {
    backgroundColor: theme.colors.primary + "10",
    borderColor: theme.colors.primary,
  },
  languageInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flag: {
    fontSize: 28,
  },
  languageName: {
    fontSize: 15,
    fontWeight: theme.fontWeights.semi,
    color: theme.colors.text,
  },
  nativeName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: "bold",
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  contributeButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: theme.radii.md,
    marginTop: 8,
    alignItems: "center",
  },
  contributeButtonText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: theme.fontWeights.semi,
  },
});
