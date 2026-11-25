import { useState } from "react";
import { gateway, loadSettings, saveSettings } from "../api.js";
import FilterBar, { matchText } from "../FilterBar.jsx";
import { Button, RefreshButton } from "../ui.jsx";
import WebhookPanel from "../WebhookPanel.jsx";

export default function Settings({ notify }) {
  const current = loadSettings();
  const [baseUrl, setBaseUrl] = useState(current.baseUrl);
  const [secret, setSecret] = useState(current.secret);
  const [health, setHealth] = useState(null);
  const [query, setQuery] = useState("");

  async function reload() {
    try {
      const healthJson = await gateway("/api/health");
      setHealth(healthJson);
      notify("Settings reloaded.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    saveSettings(baseUrl, secret);
    try {
      const json = await gateway("/api/health");
      setHealth(json);
      notify("Connected to the gateway.");
    } catch (error) {
      setHealth(null);
      notify(error.message);
    }
  }

  return (
    <>
      <FilterBar
        query={query}
        onQuery={setQuery}
        placeholder="Gateway or webhook"
        leading={<h1>Settings</h1>}
        trailing={<RefreshButton onClick={reload} />}
      />
      <p className="lead">Gateway connection for this browser, and the webhook that receives each punch.</p>
      {matchText(query, "gateway", "secret", "url") ? (
      <form className="panel form" onSubmit={save}>
        <label>Gateway URL
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        </label>
        <label>Gateway secret
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Same as GATEWAY_API_SECRET" />
        </label>
        <Button variant="primary" type="submit">Save and test</Button>
      </form>
      ) : null}
      {matchText(query, "webhook", "endpoint", "payload", "auth") ? <WebhookPanel notify={notify} /> : null}
      <section className="panel">
        <h2>Connection</h2>
        <p>Status: <span className={health?.ok ? "ok" : "bad"}>{health?.ok ? "Online" : "Not checked"}</span></p>
        <p>Open sockets: {health?.onlineDevices ?? "—"} · Webhook: {health ? (health.erpForwarding ? "On" : "Off") : "—"}</p>
        <p className="muted"><code>ws://&lt;this-computer-ip&gt;:7788/pub/chat</code></p>
      </section>
    </>
  );
}
