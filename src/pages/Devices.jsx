import { useEffect, useState } from "react";
import { Clock3, Copy, DoorOpen, Info, KeyRound, LayoutGrid, List, Logs, Plus, RotateCcw, Save, Settings, TabletSmartphone, X } from "lucide-react";
import { gateway } from "../api.js";
import { onLiveEvent } from "../live.js";
import FilterBar, { matchText } from "../FilterBar.jsx";
import { Button, RefreshButton } from "../ui.jsx";
import DataTable from "../DataTable.jsx";

const VIEW_KEY = "attendance-device-view";

function formatOffset(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return "+5.5";
  return `${number >= 0 ? "+" : ""}${number}`;
}

function profileLine(device) {
  const bits = [device.profile?.model, device.profile?.firmware].filter(Boolean).join(" · ");
  const ip = device.profile?.ipAddress ? ` · ${device.profile.ipAddress}` : "";
  return (bits || "Profile not read yet") + ip;
}

function countsLine(device) {
  if (!device.profile?.updatedAt) return "Use Device info while the terminal is online.";
  return `Users ${device.profile.userCount ?? "—"} · Faces ${device.profile.faceCount ?? "—"} · Fingerprints ${device.profile.fingerprintCount ?? "—"} · Logs ${device.profile.logCount ?? "—"}`;
}

function Actions({ device, busy, run }) {
  const serial = device.serialNumber;
  const items = [
    ["time", Clock3, "Sync time", "/api/devices/time", true],
    ["info", Info, "Device info", "/api/devices/info", false],
    ["log", Logs, "Pull logs", "/api/logs/pull", false],
    ["door", DoorOpen, "Open door", "/api/door/open", false],
    ["reboot", RotateCcw, "Reboot", "/api/devices/reboot", false],
  ];
  return (
    <div className="device-actions">
      {items.map(([key, Icon, label, path, solid]) => (
        <Button
          key={key}
          variant="icon"
          className={solid ? "solid" : ""}
          icon={Icon}
          disabled={!!busy}
          onClick={() => run(`${key}-${serial}`, path, serial)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

export default function Devices({ notify }) {
  const [devices, setDevices] = useState([]);
  const [names, setNames] = useState({});
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || "card");
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState("serial");
  const [serialInput, setSerialInput] = useState("");
  const [licenseInput, setLicenseInput] = useState("");

  async function load() {
    try {
      const json = await gateway("/api/devices");
      const rows = json.devices || [];
      setDevices(rows);
      setNames(Object.fromEntries(rows.map((device) => [device.serialNumber, device.profile?.displayName || ""])));
      notify(json.database === false ? json.message : "");
    } catch (error) {
      notify(error.message);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!adding && !settingsDraft) return undefined;
    function onKey(event) {
      if (event.key === "Escape") {
        setAdding(false);
        setSettingsDraft(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding, settingsDraft]);
  useEffect(() => onLiveEvent((event) => {
    if (event.type === "device" || event.type === "punch") load();
  }), []);

  function chooseView(next) {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  }

  async function saveName(deviceSn) {
    try {
      await gateway("/api/devices/name", { method: "POST", body: { deviceSn, name: names[deviceSn] || "" } });
      notify(`Saved name for ${deviceSn}.`);
      await load();
    } catch (error) {
      notify(error.message);
    }
  }

  async function run(key, path, deviceSn) {
    if (path.endsWith("/reboot") && !window.confirm("Reboot this device once? It will drop offline until it starts again.")) return;
    setBusy(key);
    try {
      const json = await gateway(path, { method: "POST", body: { deviceSn } });
      notify(json.time ? `Time command queued for ${json.time}` : `Command ${json.id} queued for ${deviceSn}.`);
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy("");
    }
  }

  const visible = devices.filter((device) => {
    if (status === "online" && !device.online) return false;
    if (status === "offline" && device.online) return false;
    return matchText(query, names[device.serialNumber], device.serialNumber, device.profile?.model, device.profile?.firmware, device.profile?.ipAddress);
  });

  function nameEditor(device) {
    return (
      <div className="name-row">
        <input
          value={names[device.serialNumber] ?? ""}
          placeholder="Device name"
          onChange={(event) => setNames((current) => ({ ...current, [device.serialNumber]: event.target.value }))}
        />
        <Button icon={Save} onClick={() => saveName(device.serialNumber)}>Save</Button>
      </div>
    );
  }

  function identity(device) {
    const name = names[device.serialNumber];
    return (
      <>
        <strong style={{ fontSize: 16 }}>{name || device.serialNumber}</strong>
        {name ? <p className="meta">{device.serialNumber}</p> : null}
        <p className="meta">{profileLine(device)}</p>
        <p className="meta">{countsLine(device)}</p>
      </>
    );
  }

  return (
    <>
      <FilterBar
        query={query}
        onQuery={setQuery}
        placeholder="Name, serial, model, or IP"
        leading={<h1>Devices</h1>}
        trailing={(
          <>
            <div className="seg">
              <Button variant="plain" icon={List} className={view === "list" ? "active" : ""} onClick={() => chooseView("list")}>List</Button>
              <Button variant="plain" icon={LayoutGrid} className={view === "card" ? "active" : ""} onClick={() => chooseView("card")}>Cards</Button>
            </div>
            <Button variant="primary" icon={Plus} onClick={() => { setAddMode("serial"); setAdding(true); }}>Add Device</Button>
            <RefreshButton onClick={load} />
          </>
        )}
      >
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        <span className="meta">{visible.length} of {devices.length}</span>
      </FilterBar>
      {visible.length === 0 ? <section className="panel">No devices match this filter.</section> : null}
      {view === "list" && visible.length > 0 ? (
        <DataTable
          rows={visible}
          rowKey={(device) => device.serialNumber}
          empty="No devices match this filter."
          columns={[
            { key: "device", header: "Device", render: (device) => <>{nameEditor(device)}{identity(device)}</> },
            { key: "socket", header: "Socket", render: (device) => <span className={device.online ? "ok" : "bad"}>{device.online ? "Online" : "Offline"}</span> },
            { key: "actions", header: "Actions", render: (device) => <Actions device={device} busy={busy} run={run} /> },
          ]}
        />
      ) : null}
      {view === "card" && visible.length > 0 ? (
        <section className="terminal-grid scroll">
          {visible.map((device) => {
            const profile = device.profile || {};
            const title = names[device.serialNumber] || device.serialNumber;
            const offset = profile.timezoneOffset ?? 5.5;
            return (
              <article key={device.serialNumber} className="terminal-card">
                <div className="terminal-head">
                  <div>
                    <strong>{title}</strong>
                    <div className="serial-line">
                      <span>{device.serialNumber}</span>
                      <Button variant="plain" icon={Copy} aria-label="Copy serial" onClick={() => navigator.clipboard.writeText(device.serialNumber).then(() => notify(`Copied ${device.serialNumber}`)).catch(() => notify("Could not copy the serial."))} />
                    </div>
                  </div>
                  <span className={device.online ? "ok" : "bad"}>{device.online ? "Online" : "Offline"}</span>
                </div>
                <div className="stat-row">
                  <div className="stat"><span>Users</span><strong>{profile.userCount ?? "—"}</strong></div>
                  <div className="stat"><span>Faces</span><strong>{profile.faceCount ?? "—"}</strong></div>
                  <div className="stat"><span>Logs</span><strong>{profile.logCount ?? "—"}</strong></div>
                </div>
                <div className="spec-grid">
                  <div className="spec"><span>Model</span><strong>{profile.model || "—"}</strong></div>
                  <div className="spec"><span>Firmware</span><strong>{profile.firmware || "—"}</strong></div>
                  <div className="spec"><span>IP address</span><strong>{profile.ipAddress || "—"}</strong></div>
                  <div className="spec"><span>Timezone</span><strong>UTC{formatOffset(offset)}</strong></div>
                </div>
                <div className="chip-row">
                  <span className="chip"><Clock3 size={12} /> UTC{formatOffset(offset)}</span>
                  {profile.duplicateWindow != null ? <span className="chip">Dup filter {profile.duplicateWindow}s</span> : null}
                  <span className="chip">Fingerprints {profile.fingerprintCount ?? "—"}</span>
                  {device.licenseSaved ? <span className="chip">License saved</span> : null}
                </div>
                <p className="meta">Last info: {profile.updatedAt || "Not read yet. Use Device info while it is online."}</p>
                <div className="terminal-actions">
                  <Button icon={Clock3} disabled={!!busy} onClick={() => run(`time-${device.serialNumber}`, "/api/devices/time", device.serialNumber)}>Sync time</Button>
                  <Button icon={DoorOpen} disabled={!!busy} onClick={() => run(`door-${device.serialNumber}`, "/api/door/open", device.serialNumber)}>Open door</Button>
                  <Button icon={Settings} onClick={() => setSettingsDraft({
                    serial: device.serialNumber,
                    name: names[device.serialNumber] || "",
                    timezoneOffset: profile.timezoneOffset ?? 5.5,
                    duplicateWindow: profile.duplicateWindow ?? 60,
                    webhookTimezone: profile.webhookTimezone ?? 5.5,
                  })}>Settings</Button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
      {settingsDraft ? (
        <div className="modal-back" onClick={() => setSettingsDraft(null)} role="presentation">
          <form
            className="modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await gateway("/api/devices/settings", {
                  method: "POST",
                  body: {
                    deviceSn: settingsDraft.serial,
                    name: settingsDraft.name,
                    timezoneOffset: Number(settingsDraft.timezoneOffset),
                    duplicateWindow: Number(settingsDraft.duplicateWindow),
                    webhookTimezone: Number(settingsDraft.webhookTimezone),
                  },
                });
                notify(`Saved settings for ${settingsDraft.serial}.`);
                setSettingsDraft(null);
                await load();
              } catch (error) {
                notify(error.message);
              }
            }}
          >
            <div className="modal-head">
              <h2><Settings size={16} /> Device Settings</h2>
              <Button icon={X} onClick={() => setSettingsDraft(null)} aria-label="Close" />
            </div>
            <p className="serial-line"><TabletSmartphone size={14} /> {settingsDraft.serial}</p>
            <label>Device Nickname
              <input value={settingsDraft.name} onChange={(event) => setSettingsDraft({ ...settingsDraft, name: event.target.value })} placeholder="Friendly name" />
              <span className="meta">Friendly name displayed instead of the serial number.</span>
            </label>
            <div className="settings-grid">
              <label>Timezone offset (hours)
                <input type="number" step="0.5" value={settingsDraft.timezoneOffset} onChange={(event) => setSettingsDraft({ ...settingsDraft, timezoneOffset: event.target.value })} />
                <span className="meta">For example +5.5 here, -5 for New York.</span>
              </label>
              <label>Duplicate window (sec)
                <input type="number" min="0" step="1" value={settingsDraft.duplicateWindow} onChange={(event) => setSettingsDraft({ ...settingsDraft, duplicateWindow: event.target.value })} />
                <span className="meta">0 disables it. Blocks the same person within this many seconds.</span>
              </label>
            </div>
            <label>Webhook timezone (hours)
              <input type="number" step="0.5" value={settingsDraft.webhookTimezone} onChange={(event) => setSettingsDraft({ ...settingsDraft, webhookTimezone: event.target.value })} />
              <span className="meta">Offset used when a punch is sent to a webhook. Use +5.5 for this timezone.</span>
            </label>
            <div className="modal-actions">
              <Button onClick={() => setSettingsDraft(null)}>Cancel</Button>
              <Button variant="primary" type="submit" icon={Save}>Save Settings</Button>
            </div>
          </form>
        </div>
      ) : null}
      {adding ? (
        <div className="modal-back" onClick={() => setAdding(false)} role="presentation">
          <form
            className="modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                const json = addMode === "serial"
                  ? await gateway("/api/devices", { method: "POST", body: { serialNumber: serialInput } })
                  : await gateway("/api/devices/license", { method: "POST", body: { licenseKey: licenseInput } });
                notify(json.message);
                setSerialInput("");
                setLicenseInput("");
                setAdding(false);
                await load();
              } catch (error) {
                notify(error.message);
              }
            }}
          >
            <div className="modal-head">
              <h2>Add Device</h2>
              <Button icon={X} onClick={() => setAdding(false)} aria-label="Close" />
            </div>
            <div className="mode-switch">
              <Button variant="plain" icon={TabletSmartphone} className={addMode === "serial" ? "active" : ""} onClick={() => setAddMode("serial")}>By Serial Number</Button>
              <Button variant="plain" icon={KeyRound} className={addMode === "license" ? "active" : ""} onClick={() => setAddMode("license")}>License Key</Button>
            </div>
            {addMode === "serial" ? (
              <label>Device Serial Number
                <input value={serialInput} onChange={(event) => setSerialInput(event.target.value)} placeholder="e.g. AYTC03020022" required />
                <span className="meta">Found on the label at the back of the device.</span>
              </label>
            ) : (
              <>
                <p className="meta">Paste the license key from your reseller. It must include the device serial.</p>
                <label>License Key
                  <textarea rows={5} value={licenseInput} onChange={(event) => setLicenseInput(event.target.value)} placeholder="Paste your license key here..." required />
                </label>
              </>
            )}
            <div className="modal-actions">
              <Button onClick={() => setAdding(false)}>Cancel</Button>
              <Button variant="primary" type="submit" icon={addMode === "serial" ? Plus : KeyRound}>{addMode === "serial" ? "Add Device" : "Activate"}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
