const URL_KEY = "devicePortal.url";
const SECRET_KEY = "devicePortal.secret";
const SESSION_KEY = "devicePortal.session";

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function loadSettings() {
  return {
    baseUrl: localStorage.getItem(URL_KEY) || "http://127.0.0.1:7788",
    secret: localStorage.getItem(SECRET_KEY) || "",
  };
}

export function saveSettings(baseUrl, secret) {
  localStorage.setItem(URL_KEY, baseUrl.replace(/\/+$/, ""));
  localStorage.setItem(SECRET_KEY, secret);
}

function authHeaders(secret) {
  const headers = { Accept: "application/json" };
  if (secret) headers["X-Gateway-Secret"] = secret;
  const session = loadSession();
  if (session?.token) headers["X-Portal-Token"] = session.token;
  return headers;
}

export async function gateway(path, { method = "GET", body } = {}) {
  const { baseUrl, secret } = loadSettings();
  const headers = authHeaders(secret);
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Gateway is not reachable at ${baseUrl}. Start the Python SDK first.`);
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Gateway error ${response.status}`);
  }
  return json;
}

export async function gatewayRaw(path, { method = "GET", body } = {}) {
  const { baseUrl, secret } = loadSettings();
  const headers = authHeaders(secret);
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? body : undefined,
  });
  const text = await response.text();
  let parsed = text;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  return { status: response.status, ok: response.ok, body: parsed };
}

export async function gatewayPhoto(enrollId) {
  const { baseUrl, secret } = loadSettings();
  const headers = authHeaders(secret);
  const response = await fetch(`${baseUrl}/api/persons/${enrollId}/photo`, { headers });
  if (!response.ok) return "";
  return URL.createObjectURL(await response.blob());
}
