type Handler = (data: any) => void;

import { Platform } from "react-native";

let ws: WebSocket | null = null;
let handlers: Handler[] = [];

export function connectRealtime() {
  if (ws) return;
  (async () => {
    try {
      const token = await (await import("@react-native-async-storage/async-storage")).default.getItem("accessToken");
      const host = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
      const base = `ws://${host}:8000/ws/alerts/`;
      const url = token ? `${base}?token=${encodeURIComponent(token)}` : base;
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("Realtime connected");
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          handlers.forEach((h) => h(data));
        } catch (e) {
          console.warn("Invalid realtime message", e);
        }
      };

      ws.onclose = () => {
        console.log("Realtime disconnected");
        ws = null;
      };
    } catch (e) {
      console.warn("Failed to connect realtime", e);
    }
  })();

}

export function disconnectRealtime() {
  if (!ws) return;
  ws.close();
  ws = null;
}

export function onRealtime(handler: Handler) {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter((h) => h !== handler);
  };
}
