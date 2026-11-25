import { useEffect, useRef, useState } from "react";
import {
  Braces, Check, Copy, DoorOpen, Eye, EyeOff, Fingerprint, Lock, Pencil, Plus,
  Power, Save, Send, Settings2, SlidersHorizontal, Trash2, Webhook, Wifi, WifiOff, X,
} from "lucide-react";
import { gateway } from "./api.js";
import { Button } from "./ui.jsx";

const EDITOR_TABS = [
  ["general", "General", Settings2],
  ["auth", "Auth", Lock],
  ["payload", "Payload", Braces],
  ["response", "Response Mapping", SlidersHorizontal],
  ["advanced", "Advanced", SlidersHorizontal],
];

const EVENTS = [
  ["attendance", "Attendance Log", "When a biometric scan is recorded", Fingerprint],
  ["device_online", "Device Online", "When a device connects", Wifi],
  ["device_offline", "Device Offline", "When a device disconnects", WifiOff],
  ["door_event", "Door Event", "Door open and close events", DoorOpen],
];

const AUTH_TYPES = [
  ["none", "No Auth"],
  ["bearer", "Bearer Token"],
  ["basic", "Basic Auth"],
  ["apikey", "API Key"],
  ["header", "Custom Header"],
];

const VARIABLES = [
  "enrollId", "timestamp", "timestampLocal", "timestampUnix", "deviceSerial", "mode",
  "modeName", "doorNumber", "inOut", "event", "temperature", "hasPhoto", "logId",
];

const SAMPLE = `{
  "enrollId": "{{enrollId}}",
  "timestamp": "{{timestamp}}",
  "timestampLocal": "{{timestampLocal}}",
  "deviceSerial": "{{deviceSerial}}",
  "mode": "{{mode}}",
  "modeName": "{{modeName}}",
  "doorNumber": "{{doorNumber}}",
  "temperature": "{{temperature}}",
  "event": "{{event}}",
  "hasPhoto": "{{hasPhoto}}"
}`;

const AUTH_LABEL = {
  bearer: "Bearer",
  basic: "Basic Auth",
  apikey: "API Key",
  header: "Custom Header",
};

function blankEndpoint() {
  return {
    id: "",
    name: "",
    active: true,
    method: "POST",
    url: "",
    description: "",
    contentType: "application/json",
    events: ["attendance"],
    deviceSerials: [],
    authType: "none",
    authHeader: "X-API-Key",
    authSecret: "",
    authUser: "",
    authPassword: "",
    customHeaders: "{}",
    payloadTemplate: SAMPLE,
    includePhoto: false,
    successCodes: "200,201,204",
    responseMapping: false,
    responseField: "",
    responseValue: "",
    retries: 3,
    retryDelayMs: 1000,
    timeoutMs: 5000,
    hmacSecret: "",
    timezoneOffset: false,
  };
}

export default function WebhookPanel({ notify }) {
  const [mode, setMode] = useState("direct");
  const [endpoints, setEndpoints] = useState([]);
  const [devices, setDevices] = useState([]);
  const [draft, setDraft] = useState(null);
  const [tab, setTab] = useState("general");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState("");
  const [showHmac, setShowHmac] = useState(false);
  const payloadRef = useRef(null);

  async function load() {
    const [hooks, deviceJson] = await Promise.all([
      gateway("/api/webhooks"),
      gateway("/api/devices").catch(() => ({ devices: [] })),
    ]);
    setMode(hooks.mode || "direct");
    setEndpoints(hooks.endpoints || []);
    setDevices(deviceJson.devices || []);
  }

  useEffect(() => {
    load().catch((error) => notify(error.message));
  }, []);

  function setField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleEvent(name) {
    setDraft((current) => {
      const events = current.events || [];
      return { ...current, events: events.includes(name) ? events.filter((item) => item !== name) : [...events, name] };
    });
  }

  function toggleDevice(serial) {
    setDraft((current) => {
      const chosen = current.deviceSerials || [];
      return {
        ...current,
        deviceSerials: chosen.includes(serial) ? chosen.filter((item) => item !== serial) : [...chosen, serial],
      };
    });
  }

  async function chooseMode(next) {
    try {
      const json = await gateway("/api/webhooks/mode", { method: "PUT", body: { mode: next } });
      setMode(json.mode);
      setEndpoints(json.endpoints || []);
      notify(next === "direct" ? "Punches stay in the gateway database." : "Active webhooks will receive new punches.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.url.trim()) {
      notify("Webhook name and endpoint URL are required.");
      return;
    }
    if (!draft.events?.length) {
      notify("Choose at least one trigger event.");
      return;
    }
    setBusy(true);
    try {
      const path = draft.id ? `/api/webhooks/${draft.id}` : "/api/webhooks";
      const json = await gateway(path, { method: draft.id ? "PUT" : "POST", body: draft });
      setEndpoints(json.endpoints || []);
      setMode(json.mode || mode);
      setDraft(null);
      notify(draft.id ? "Webhook saved." : "Webhook created.");
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Delete webhook ${item.name || item.url}?`)) return;
    try {
      const json = await gateway(`/api/webhooks/${item.id}`, { method: "DELETE" });
      setEndpoints(json.endpoints || []);
      if (draft?.id === item.id) setDraft(null);
      notify("Webhook deleted.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function toggleActive(item) {
    try {
      const json = await gateway(`/api/webhooks/${item.id}`, { method: "PUT", body: { ...item, active: !item.active } });
      setEndpoints(json.endpoints || []);
      notify(item.active ? `${item.name || "Webhook"} is inactive.` : `${item.name || "Webhook"} is active.`);
    } catch (error) {
      notify(error.message);
    }
  }

  async function testSend(item) {
    setTesting(item.id);
    try {
      const json = await gateway(`/api/webhooks/${item.id}/test`, { method: "POST", body: {} });
      notify(json.ok ? `Test accepted · HTTP ${json.status}` : `Test failed · HTTP ${json.status || "error"}`);
      await load();
    } catch (error) {
      notify(error.message);
    } finally {
      setTesting("");
    }
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => notify("Webhook URL copied.")).catch(() => notify("Could not copy the URL."));
  }

  function insertVariable(name) {
    const token = `{{${name}}}`;
    navigator.clipboard.writeText(token).catch(() => {});
    const node = payloadRef.current;
    const current = draft.payloadTemplate || "";
    const start = node?.selectionStart ?? current.length;
    const end = node?.selectionEnd ?? current.length;
    setField("payloadTemplate", `${current.slice(0, start)}${token}${current.slice(end)}`);
    notify(`Copied ${token}`);
  }

  const activeCount = endpoints.filter((item) => item.active && item.url).length;

  return (
    <>
      <section className="panel wh-card">
        <h2><Settings2 size={16} /> Attendance Mode</h2>
        <p className="meta">Choose how attendance data from your devices is handled.</p>
        <div className="mode-row">
          <div className="mode-switch">
            <Button variant="plain" className={mode === "direct" ? "active" : ""} onClick={() => chooseMode("direct")}>Direct Storage</Button>
            <Button variant="plain" className={mode === "external" ? "active" : ""} onClick={() => chooseMode("external")}>External (Webhook)</Button>
          </div>
          <Button variant="primary" icon={Plus} onClick={() => { setDraft(blankEndpoint()); setTab("general"); }}>New Webhook</Button>
        </div>
        <p className="note">
          {mode === "direct"
            ? "Direct Storage: punches stay in the database. New Webhook still saves an endpoint in this mode."
            : "External: punches stay in the database and are also sent to every active webhook. New Webhook saves an endpoint in this mode too."}
        </p>
      </section>

      <section className="panel wh-card">
        <div className="toolbar">
          <div>
            <h2><Webhook size={16} /> Webhook Endpoints</h2>
            <p className="meta">{endpoints.length} configured · {activeCount} active</p>
          </div>
          <div className="trail">
            <Button variant="primary" icon={Plus} onClick={() => { setDraft(blankEndpoint()); setTab("general"); }}>New Webhook</Button>
          </div>
        </div>

        {draft ? (
          <form onSubmit={save}>
            <div className="tabs">
              {EDITOR_TABS.map(([id, label, Icon]) => (
                <Button key={id} variant="plain" icon={Icon} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</Button>
              ))}
            </div>

            {tab === "general" ? (
              <div className="wh-fields">
                <label>Webhook Name
                  <input value={draft.name} onChange={(event) => setField("name", event.target.value)} placeholder="e.g. HR System, Slack Notification" required />
                </label>
                <label>HTTP Method
                  <select value={draft.method} onChange={(event) => setField("method", event.target.value)}>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                  </select>
                </label>
                <label className="wide">Endpoint URL
                  <input value={draft.url} onChange={(event) => setField("url", event.target.value)} placeholder="https://your-server.com/api/webhook" required />
                </label>
                <label className="wide">Description
                  <input value={draft.description} onChange={(event) => setField("description", event.target.value)} placeholder="What does this webhook do?" />
                </label>
                <label>Content Type
                  <select value={draft.contentType} onChange={(event) => setField("contentType", event.target.value)}>
                    <option value="application/json">application/json</option>
                    <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
                  </select>
                </label>
                <div className="wide">
                  <p className="meta">Trigger Events</p>
                  <div className="event-grid">
                    {EVENTS.map(([id, title, hint, Icon]) => (
                      <Button key={id} variant="plain" icon={Icon} className={(draft.events || []).includes(id) ? "event-card on" : "event-card"} onClick={() => toggleEvent(id)}>
                        <span><strong>{title}</strong><small>{hint}</small></span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="wide">
                  <p className="meta">Filter by Devices (empty = all devices)</p>
                  <div className="chip-pick">
                    {devices.length === 0 ? <span className="meta">No devices on this gateway yet.</span> : devices.map((device) => {
                      const on = (draft.deviceSerials || []).includes(device.serialNumber);
                      const label = device.profile?.displayName || device.serialNumber;
                      return (
                        <Button key={device.serialNumber} variant="plain" icon={on ? Check : undefined} className={on ? "on" : ""} onClick={() => toggleDevice(device.serialNumber)}>
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "auth" ? (
              <div className="wh-fields">
                <div className="wide">
                  <p className="meta">Authentication Type</p>
                  <div className="mode-switch">
                    {AUTH_TYPES.map(([id, label]) => (
                      <Button key={id} variant="plain" className={draft.authType === id ? "active" : ""} onClick={() => setField("authType", id)}>{label}</Button>
                    ))}
                  </div>
                </div>
                {draft.authType === "bearer" ? (
                  <label className="wide">Bearer Token
                    <input type="password" value={draft.authSecret} onChange={(event) => setField("authSecret", event.target.value)} placeholder="Sent as Authorization: Bearer" />
                  </label>
                ) : null}
                {draft.authType === "basic" ? (
                  <>
                    <label>Username
                      <input value={draft.authUser} onChange={(event) => setField("authUser", event.target.value)} />
                    </label>
                    <label>Password
                      <input type="password" value={draft.authPassword} onChange={(event) => setField("authPassword", event.target.value)} />
                    </label>
                  </>
                ) : null}
                {draft.authType === "apikey" || draft.authType === "header" ? (
                  <>
                    <label>Header name
                      <input value={draft.authHeader} onChange={(event) => setField("authHeader", event.target.value)} placeholder={draft.authType === "apikey" ? "X-API-Key" : "x-timmy-secret"} />
                    </label>
                    <label>Value
                      <input type="password" value={draft.authSecret} onChange={(event) => setField("authSecret", event.target.value)} />
                    </label>
                  </>
                ) : null}
                <label className="wide">Custom Headers (JSON)
                  <textarea rows={4} spellCheck={false} value={draft.customHeaders} onChange={(event) => setField("customHeaders", event.target.value)} />
                </label>
              </div>
            ) : null}

            {tab === "payload" ? (
              <div className="wh-fields">
                <div className="wide var-box">
                  <p className="meta">Available Variables</p>
                  <div className="chip-pick">
                    {VARIABLES.map((name) => (
                      <Button key={name} variant="plain" onClick={() => insertVariable(name)}>{`{{${name}}}`}</Button>
                    ))}
                  </div>
                  <p className="meta">Click a variable to copy it and insert it in the body.</p>
                </div>
                <label className="wide">Body Template (JSON)
                  <textarea ref={payloadRef} rows={12} spellCheck={false} value={draft.payloadTemplate} onChange={(event) => setField("payloadTemplate", event.target.value)} />
                </label>
                <label className="wide check-line">
                  <input type="checkbox" checked={!!draft.includePhoto} onChange={(event) => setField("includePhoto", event.target.checked)} />
                  Include capture photo in payload (Base64) when available
                </label>
              </div>
            ) : null}

            {tab === "response" ? (
              <div className="wh-fields">
                <div className="wide map-note">
                  <strong>Response Path Mapping</strong>
                  <p className="meta">Choose which field in the server response counts as success. Use a dot for nested objects, for example data.ok.</p>
                </div>
                <label className="wide check-line">
                  <input type="checkbox" checked={!!draft.responseMapping} onChange={(event) => setField("responseMapping", event.target.checked)} />
                  Enable Response Mapping — treat a response field as the success check
                </label>
                {draft.responseMapping ? (
                  <>
                    <label>Success status codes
                      <input value={draft.successCodes} onChange={(event) => setField("successCodes", event.target.value)} placeholder="200,201,204" />
                    </label>
                    <label>Response path
                      <input value={draft.responseField} onChange={(event) => setField("responseField", event.target.value)} placeholder="ok" />
                    </label>
                    <label>Expected value
                      <input value={draft.responseValue} onChange={(event) => setField("responseValue", event.target.value)} placeholder="true" />
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}

            {tab === "advanced" ? (
              <div className="wh-fields">
                <label>Retries
                  <input type="number" min="0" max="5" value={draft.retries} onChange={(event) => setField("retries", Number(event.target.value))} />
                  <span className="meta">The test button uses this count. A live punch tries once more after the first failure.</span>
                </label>
                <label>Retry Delay (ms)
                  <input type="number" min="0" step="100" value={draft.retryDelayMs} onChange={(event) => setField("retryDelayMs", Number(event.target.value))} />
                </label>
                <label>Timeout (ms)
                  <input type="number" min="1000" max="30000" step="500" value={draft.timeoutMs} onChange={(event) => setField("timeoutMs", Number(event.target.value))} />
                </label>
                <label className="wide">Webhook Secret (HMAC-SHA256)
                  <span className="secret-line">
                    <input type={showHmac ? "text" : "password"} value={draft.hmacSecret} onChange={(event) => setField("hmacSecret", event.target.value)} placeholder="Leave empty to disable signature verification" />
                    <Button icon={showHmac ? EyeOff : Eye} onClick={() => setShowHmac((value) => !value)} aria-label="Show secret" />
                  </span>
                  <span className="meta">When set, each request includes X-Timy-Signature and X-Timy-Timestamp.</span>
                </label>
                <label className="wide check-line">
                  <input type="checkbox" checked={!!draft.timezoneOffset} onChange={(event) => setField("timezoneOffset", event.target.checked)} />
                  Enable Timezone Offset — shift timestamps in the webhook payload to UTC
                </label>
              </div>
            ) : null}

            <div className="modal-actions">
              <Button icon={X} onClick={() => setDraft(null)}>Cancel</Button>
              <Button variant="primary" type="submit" icon={Save} disabled={busy}>{draft.id ? "Save Webhook" : "Create Webhook"}</Button>
            </div>
          </form>
        ) : null}

        <div className="wh-saved">
          {endpoints.length === 0 ? <p className="meta">No webhook yet.</p> : endpoints.map((item) => (
            <article key={item.id} className="wh-item">
              <div>
                <div className="wh-title">
                  <strong>{item.name || "Untitled webhook"}</strong>
                  <span className={item.active ? "badge on" : "badge off"}>{item.active ? "Active" : "Inactive"}</span>
                  {AUTH_LABEL[item.authType] ? <span className="badge auth">{AUTH_LABEL[item.authType]}</span> : null}
                </div>
                <p className="wh-url"><span className="verb post">{item.method}</span> {item.url || "No URL"}</p>
                <p className="meta">
                  <Check size={12} /> {item.successCount || 0}
                  <X size={12} /> {item.failCount || 0}
                  {item.consecutiveFails ? ` · ${item.consecutiveFails} consecutive` : ""}
                  {item.lastStatus ? ` · Last HTTP ${item.lastStatus}` : ""}
                  {item.lastTriggered ? ` · Triggered ${item.lastTriggered}` : ""}
                  {` · Events: ${(item.events || []).join(", ") || "attendance"}`}
                </p>
              </div>
              <div className="wh-actions">
                <Button variant="plain" icon={Copy} aria-label="Copy URL" onClick={() => copyUrl(item.url)} />
                <Button variant="plain" className="go" icon={Send} aria-label="Send test" disabled={testing === item.id} onClick={() => testSend(item)} />
                <Button variant="plain" icon={Pencil} aria-label="Edit" onClick={() => { setDraft({ ...blankEndpoint(), ...item, customHeaders: item.customHeaders || "{}" }); setTab("general"); }} />
                <Button variant="plain" className={item.active ? "on" : ""} icon={Power} aria-label={item.active ? "Pause" : "Activate"} onClick={() => toggleActive(item)} />
                <Button variant="plain" className="danger" icon={Trash2} aria-label="Delete" onClick={() => remove(item)} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
