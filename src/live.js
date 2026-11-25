import { loadSettings } from "./api.js";

const eventListeners = new Set();
const statusListeners = new Set();
let socket = null;
let retry = null;
let connected = false;

function setConnected(next) {
  connected = next;
  statusListeners.forEach((listener) => listener(connected));
}

function notify(event) {
  eventListeners.forEach((listener) => listener(event));
}

export function liveConnected() {
  return connected;
}

export function onLiveStatus(listener) {
  statusListeners.add(listener);
  listener(connected);
  return () => statusListeners.delete(listener);
}

export function onLiveEvent(listener) {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

export function disconnectLive() {
  if (retry) window.clearTimeout(retry);
  retry = null;
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  setConnected(false);
}

export function connectLive() {
  if (retry) window.clearTimeout(retry);
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  const { baseUrl, secret } = loadSettings();
  const wsBase = baseUrl.replace(/^http/, "ws");
  const url = `${wsBase}/portal/live?secret=${encodeURIComponent(secret || "")}`;
  try {
    socket = new WebSocket(url);
  } catch {
    setConnected(false);
    retry = window.setTimeout(connectLive, 4000);
    return;
  }
  socket.onopen = () => setConnected(true);
  socket.onmessage = (message) => {
    try {
      notify(JSON.parse(message.data));
    } catch {
      notify({ type: "message" });
    }
  };
  socket.onclose = () => {
    setConnected(false);
    retry = window.setTimeout(connectLive, 4000);
  };
  socket.onerror = () => setConnected(false);
}
