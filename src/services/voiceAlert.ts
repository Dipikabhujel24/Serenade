import { Platform } from "react-native";
import { getLiveLocation } from "./locationService";
import { sosAlert } from "./api";

let recognition: any = null;

export function startVoiceMonitor(onStatus?: (s: string) => void) {
  if (Platform.OS === "web") {
    const win: any = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onStatus && onStatus("SpeechRecognition not supported in this browser");
      return false;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      onStatus && onStatus("listening");
    };

    recognition.onerror = (e: any) => {
      console.warn("SpeechRecognition error", e);
      onStatus && onStatus("error: " + (e?.error || e?.message || "unknown"));
    };

    recognition.onresult = async (event: any) => {
      try {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();
          console.log("Speech result:", transcript);
          // simple keyword match
          if (transcript.includes("help me") || transcript.includes("help") || transcript.includes("sos")) {
            onStatus && onStatus("triggered: " + transcript);
            // send SOS with location when possible
            try {
              const loc = await getLiveLocation();
              await sosAlert({ alert_type: "sos", message: `Voice trigger: ${transcript}`, latitude: loc.latitude, longitude: loc.longitude });
            } catch (err) {
              // still send without location
              try {
                await sosAlert({ alert_type: "sos", message: `Voice trigger (no loc): ${transcript}` });
              } catch (e) {
                console.warn("Failed to send sos from voice trigger", e);
              }
            }
          }
        }
      } catch (e) {
        console.warn(e);
      }
    };

    recognition.start();
    return true;
  }

  // Native / Expo fallback: we don't implement hotword detection here.
  onStatus && onStatus("Voice detection not supported on Expo Go. Use web or a dev client.");
  return false;
}

export function stopVoiceMonitor() {
  if (recognition) {
    try {
      recognition.stop();
    } catch {}
    recognition = null;
  }
}
