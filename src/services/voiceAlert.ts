import { Platform, PermissionsAndroid } from "react-native";
import Constants from "expo-constants";
import { getLiveLocation } from "./locationService.js";
import { sosAlert } from "./api.js";

let webRecognition: any = null;
let Voice: any = null;
let voiceListening = false;
let userStopped = false;
let lastTriggerAt = 0;

const TRIGGER_PHRASES = ["help me", "help", "sos"];
const TRIGGER_COOLDOWN_MS = 10000;

async function requestMicrophonePermission() {
  if (Platform.OS !== "android") return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone Permission",
        message: "Serenade needs microphone access for voice SOS.",
        buttonPositive: "OK",
        buttonNegative: "Cancel",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    console.warn("Failed to request microphone permission", e);
    return false;
  }
}

function isTriggerPhrase(transcript: string) {
  return TRIGGER_PHRASES.some((phrase) => transcript.includes(phrase));
}

async function sendVoiceSOS(transcript: string) {
  const now = Date.now();
  if (now - lastTriggerAt < TRIGGER_COOLDOWN_MS) return;
  lastTriggerAt = now;

  try {
    const loc: any = await getLiveLocation();
    const payload: any = {
      alert_type: "sos",
      message: `Voice trigger: ${transcript}`,
      latitude: loc.latitude,
      longitude: loc.longitude,
    };
    if (loc.accuracy != null) payload.accuracy = loc.accuracy;
    if (loc.timestamp) payload.timestamp = loc.timestamp;
    await sosAlert(payload);
  } catch (err) {
    try {
      await sosAlert({ alert_type: "sos", message: `Voice trigger (no loc): ${transcript}` });
    } catch (e) {
      console.warn("Failed to send sos from voice trigger", e);
    }
  }
}

function loadVoiceModule() {
  if (Voice) return Voice;
  const mod = require("react-native-voice");
  Voice = mod?.default || mod;
  return Voice;
}

function isExpoGoRuntime() {
  return (Constants as any)?.appOwnership === "expo";
}

async function startNativeVoice(onStatus?: (s: string) => void) {
  if (isExpoGoRuntime()) {
    onStatus && onStatus("Voice detection requires a development build");
    return false;
  }

  try {
    loadVoiceModule();
  } catch (e) {
    onStatus && onStatus("Voice detection not supported in this build");
    return false;
  }

  const ok = await requestMicrophonePermission();
  if (!ok) {
    onStatus && onStatus("Microphone permission denied");
    return false;
  }

  userStopped = false;

  Voice.onSpeechResults = async (e: any) => {
    const values: string[] = e?.value || [];
    for (const v of values) {
      const transcript = v.trim().toLowerCase();
      if (isTriggerPhrase(transcript)) {
        onStatus && onStatus("triggered: " + transcript);
        await sendVoiceSOS(transcript);
      }
    }
  };

  Voice.onSpeechError = (e: any) => {
    const msg = e?.error?.message || e?.message || "unknown";
    onStatus && onStatus("error: " + msg);
    if (!userStopped) {
      Voice.start("en-US").catch(() => {});
    }
  };

  Voice.onSpeechEnd = () => {
    if (!userStopped) {
      Voice.start("en-US").catch(() => {});
    }
  };

  try {
    await Voice.start("en-US");
    voiceListening = true;
    onStatus && onStatus("listening");
    return true;
  } catch (e: any) {
    onStatus && onStatus("error: " + (e?.message || "unknown"));
    return false;
  }
}

export async function startVoiceMonitor(onStatus?: (s: string) => void) {
  if (Platform.OS === "web") {
    const win: any = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onStatus && onStatus("SpeechRecognition not supported in this browser");
      return false;
    }

    webRecognition = new SpeechRecognition();
    webRecognition.continuous = true;
    webRecognition.interimResults = false;
    webRecognition.lang = "en-US";

    webRecognition.onstart = () => {
      onStatus && onStatus("listening");
    };

    webRecognition.onerror = (e: any) => {
      console.warn("SpeechRecognition error", e);
      onStatus && onStatus("error: " + (e?.error || e?.message || "unknown"));
    };

    webRecognition.onresult = async (event: any) => {
      try {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();
          if (isTriggerPhrase(transcript)) {
            onStatus && onStatus("triggered: " + transcript);
            await sendVoiceSOS(transcript);
          }
        }
      } catch (e) {
        console.warn(e);
      }
    };

    webRecognition.start();
    return true;
  }

  return await startNativeVoice(onStatus);
}

// Diagnostic helper: returns a short string describing whether voice recognition is available
export function voiceSupportInfo() {
  try {
    if (Platform.OS === 'web') {
      const win: any = window as any;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      return SpeechRecognition ? 'web-speech-available' : 'web-speech-unavailable';
    }
    // on native, if running in Expo Go, we cannot access native voice module
    if (isExpoGoRuntime()) return 'expo-go-unsupported';
    // try to require the native module (non-throwing)
    try {
      const mod = require('react-native-voice');
      const V = mod?.default || mod;
      if (V && typeof V.start === 'function') return 'native-voice-available';
      return 'native-voice-missing';
    } catch (e) {
      return 'native-voice-not-installed';
    }
  } catch (e) {
    return 'unknown';
  }
}

export function stopVoiceMonitor() {
  userStopped = true;
  if (Platform.OS === "web") {
    if (webRecognition) {
      try {
        webRecognition.stop();
      } catch {}
      webRecognition = null;
    }
    return;
  }

  if (Voice) {
    try {
      Voice.stop();
    } catch {}
    try {
      Voice.destroy();
    } catch {}
    if (typeof Voice.removeAllListeners === "function") {
      try {
        Voice.removeAllListeners();
      } catch {}
    }
  }
  voiceListening = false;
}
