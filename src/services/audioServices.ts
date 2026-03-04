import { Audio } from "expo-av";
import { getStoredItem, setStoredItem } from "./storage.js";

let recording: Audio.Recording | null = null;

export const startVoiceRecording = async () => {
  try {
    await Audio.requestPermissionsAsync();

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const result = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    recording = result.recording;
  } catch (err) {
    console.log("Recording error:", err);
  }
};

export const stopVoiceRecording = async () => {
  try {
    if (!recording) return null;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();

    recording = null;

    if (uri) {
      await setStoredItem("fake_call_voice", uri);
    }

    return uri;
  } catch (err) {
    console.log("Stop recording error:", err);
  }
};

export const playRecordedVoice = async () => {
  try {
    const uri = await getStoredItem("fake_call_voice");

    if (!uri) return;

    const { sound } = await Audio.Sound.createAsync({ uri });

    await sound.playAsync();
  } catch (err) {
    console.log("Playback error:", err);
  }
};