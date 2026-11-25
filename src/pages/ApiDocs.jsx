import { useState } from "react";
import { loadSettings, gatewayRaw } from "../api.js";
import { Send } from "lucide-react";
import FilterBar, { matchText } from "../FilterBar.jsx";
import { Button } from "../ui.jsx";

const CALLS = [
  { method: "GET", path: "/api/health", body: "", note: "Gateway status, open device sockets, and whether the webhook is on." },
  { method: "GET", path: "/api/dashboard", body: "", note: "Today's punches, people, and the latest activity." },
  { method: "GET", path: "/api/devices", body: "", note: "Terminals, display name, firmware profile, and online state." },
  { method: "POST", path: "/api/devices/name", body: `{
  "deviceSn": "AYTC03020022",
  "name": "Main gate"
}`, note: "Save the name shown in the portal. The serial does not change." },
  { method: "POST", path: "/api/devices/time", body: `{
  "deviceSn": "AYTC03020022"
}`, note: "Queue a clock sync. The gateway fills the current time." },
  { method: "POST", path: "/api/devices/info", body: `{
  "deviceSn": "AYTC03020022"
}`, note: "Ask the terminal for firmware, user counts, and log counts." },
  { method: "POST", path: "/api/logs/pull", body: `{
  "deviceSn": "AYTC03020022",
  "full": false
}`, note: "Pull new punches. Set full to true for the whole log." },
  { method: "POST", path: "/api/door/open", body: `{
  "deviceSn": "AYTC03020022",
  "doorNum": 1
}`, note: "Pulse door 1." },
  { method: "POST", path: "/api/devices/reboot", body: `{
  "deviceSn": "AYTC03020022"
}`, note: "Reboot once. The gateway does not send this command again." },
  { method: "GET", path: "/api/persons", body: "", note: "People stored on this gateway." },
  { method: "POST", path: "/api/persons", body: `{
  "enrollId": 1,
  "name": "Asha",
  "privilege": 0,
  "cardNum": "",
  "password": "",
  "deviceSn": "AYTC03020022",
  "push": true
}`, note: "Save a person. push queues the name onto that terminal." },
  { method: "POST", path: "/api/persons/delete", body: `{
  "deviceSn": "AYTC03020022",
  "enrollId": 1
}`, note: "Queue deleteuser for one enroll id." },
  { method: "GET", path: "/api/records?limit=20", body: "", note: "Latest punches with name, photo flag, and verify method." },
  { method: "GET", path: "/api/commands", body: "", note: "Recent device commands and whether they finished." },
  { method: "POST", path: "/api/commands", body: `{
  "deviceSn": "AYTC03020022",
  "name": "getuserlist",
  "payload": { "cmd": "getuserlist", "stn": true }
}`, note: "Queue any terminal command. payload is the JSON the device receives." },
  { method: "GET", path: "/api/webhooks", body: "", note: "Webhook endpoints, how many are configured, and how many are active." },
  { method: "POST", path: "/api/webhooks", body: `{
  "name": "ERP attendance",
  "url": "http://127.0.0.1:8000/api/webhooks/timmy",
  "method": "POST",
  "active": true,
  "authType": "header",
  "authHeader": "x-timmy-secret",
  "authSecret": "your-webhook-secret"
}`, note: "Add an endpoint. Active endpoints receive each new punch when External mode is on." },
  { method: "GET", path: "/api/settings/webhook", body: "", note: "The first active webhook, kept for the older single-URL client." },
  { method: "POST", path: "/api/settings/webhook", body: `{
  "attendanceUrl": "http://127.0.0.1:8000/api/webhooks/timmy",
  "webhookSecret": "your-webhook-secret"
}`, note: "Save where each punch is forwarded. The header sent is x-timmy-secret." },
  { method: "WS", path: "/portal/live", body: "", note: "Browser socket. Events: hello, punch, device. Query secret is the gateway secret." },
];

export default function ApiDocs({ notify }) {
  const [active, setActive] = useState(0);
  const [path, setPath] = useState(CALLS[0].path);
  const [body, setBody] = useState(CALLS[0].body);
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const call = CALLS[active];
  const { baseUrl, secret } = loadSettings();

  function open(index) {
    setActive(index);
    setPath(CALLS[index].path);
    setBody(CALLS[index].body);
    setResult(null);
  }

  async function send() {
    if (call.method === "WS") {
      setResult({ status: "WS", body: { url: `${baseUrl.replace(/^http/, "ws")}${path}?secret=***` } });
      return;
    }
    setSending(true);
    try {
      const response = await gatewayRaw(path, {
        method: call.method,
        body: call.method === "GET" ? undefined : body,
      });
      setResult(response);
      notify(response.ok ? `${call.method} ${path} · ${response.status}` : `Request failed · ${response.status}`);
    } catch (error) {
      setResult({ status: 0, body: { message: error.message } });
      notify(error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
    <header className="docs-heading">
      <h1>API Docs</h1>
      <p className="lead">Requests you can send to this gateway. The saved gateway secret and your sign-in are added automatically.</p>
    </header>
    <div className="docs-app">
      <div className="docs-list scroll">
        <FilterBar query={query} onQuery={setQuery} placeholder="Method or path" />
        {CALLS.map((item, index) => ({ item, index })).filter(({ item }) => matchText(query, item.method, item.path, item.note)).map(({ item, index }) => (
          <Button key={item.method + item.path} variant="plain" className={index === active ? "active" : ""} onClick={() => open(index)}>
            <span className={`verb ${item.method.toLowerCase()}`}>{item.method}</span>
            <span>{item.path}</span>
          </Button>
        ))}
      </div>
      <div className="docs-work scroll">
        <div className="toolbar">
          <h2>Request</h2>
          <div className="trail">
            <Button icon={Send} disabled={sending} onClick={send}>
              {sending ? "Sending" : "Send"}
            </Button>
          </div>
        </div>
        <p className="lead">{call.note}</p>
        <div className="request-bar">
          <span className={`verb ${call.method.toLowerCase()}`}>{call.method}</span>
          <input value={path} onChange={(event) => setPath(event.target.value)} />
        </div>
        <p className="muted">Header X-Gateway-Secret is added from Settings. Base {baseUrl}. Secret {secret ? "saved" : "missing"}.</p>
        {call.method !== "GET" && call.method !== "WS" ? (
          <label>Body
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={10} spellCheck={false} />
          </label>
        ) : null}
        <section className="panel response">
          <h2>Response {result ? result.status : ""}</h2>
          <pre>{result ? JSON.stringify(result.body, null, 2) : "Press Send to call the live gateway."}</pre>
        </section>
      </div>
    </div>
    </>
  );
}
