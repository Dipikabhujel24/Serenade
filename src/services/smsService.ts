import { Linking, Platform } from "react-native";
import { getStoredItem } from "./storage.js";
// Prefer expo-sms when available (opens composer). Falls back to Linking if not.
let SMS: any = null;
try {
  // dynamic import so app still runs if expo-sms isn't installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SMS = require("expo-sms");
} catch (e) {
  SMS = null;
}

export async function sendSmsToContacts(contacts: string[], message: string) {
  if (!contacts || contacts.length === 0) throw new Error("No emergency contacts configured");

  // Try expo-sms first
  if (SMS && typeof SMS.isAvailableAsync === "function") {
    try {
      const available = await SMS.isAvailableAsync();
      if (available) {
        return await SMS.sendSMSAsync(contacts, message);
      }
    } catch (e) {
      console.warn("expo-sms failed, falling back to Linking", e);
    }
  }

  // Fallback: open device SMS app via Linking
  try {
    // On iOS recipients separated by comma, on Android by semicolon
    const sep = Platform.OS === "ios" ? "," : ";";
    const recipients = contacts.join(sep);
    const bodyPrefix = Platform.OS === "ios" ? "&body=" : "?body=";
    const url = `sms:${recipients}${bodyPrefix}${encodeURIComponent(message)}`;
    await Linking.openURL(url);
    return { result: "opened_composer" };
  } catch (err) {
    console.error("Failed to open SMS composer", err);
    throw err;
  }
}

export async function getStoredEmergencyContacts(): Promise<string[]> {
  try {
    const raw = await getStoredItem("emergency_contacts");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // parsed may be array of objects {name, phone} (EmergencyContacts.tsx) or simple strings (Settings.tsx)
    if (Array.isArray(parsed)) {
      return parsed.map((p: any) => (typeof p === "string" ? p : p.phone || p));
    }
    return [];
  } catch (e) {
    console.warn("Failed to read emergency_contacts", e);
    return [];
  }
}
