import { useEffect, useState } from "react";
import { Download, Filter } from "lucide-react";
import { gateway, gatewayPhoto } from "../api.js";
import { onLiveEvent } from "../live.js";
import { Button, RefreshButton } from "../ui.jsx";
import DataTable from "../DataTable.jsx";

const emptyFilter = { device: "all", enroll: "", from: "", to: "" };

function exportCsv(records) {
  const header = ["Enroll id", "Name", "Device", "Time", "Mode", "Direction", "Temperature"];
  const lines = records.map((row) => [
    row.enroll_id,
    row.name || "",
    row.device_serial_num,
    row.records_time,
    `${row.verifyMethod || "Mode"} (${row.mode})`,
    Number(row.intOut) === 1 ? "Out" : "In",
    row.temperature || "",
  ].map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","));
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "attendance.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function dayOf(value) {
  return String(value || "").slice(0, 10);
}

function formatStamp(value) {
  const parsed = new Date(String(value || "").replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return value || "—";
  return parsed.toLocaleString([], {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Attendance({ notify }) {
  const [records, setRecords] = useState([]);
  const [devices, setDevices] = useState([]);
  const [photos, setPhotos] = useState({});
  const [serverTime, setServerTime] = useState("");
  const [draft, setDraft] = useState(emptyFilter);
  const [applied, setApplied] = useState(emptyFilter);
  const [preview, setPreview] = useState(null);

  async function load() {
    try {
      const [logs, terminals] = await Promise.all([
        gateway("/api/records?limit=200"),
        gateway("/api/devices"),
      ]);
      setRecords(logs.records || []);
      setDevices(terminals.devices || []);
      setServerTime(logs.serverTime || "");
      notify("");
    } catch (error) {
      notify(error.message);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!preview) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setPreview(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);
  useEffect(() => onLiveEvent((event) => {
    if (event.type === "punch") load();
  }), []);

  useEffect(() => {
    const ids = [...new Set(records.filter((row) => row.hasPhoto).map((row) => row.enroll_id))];
    let cancelled = false;
    const created = [];
    (async () => {
      const next = {};
      for (const id of ids) {
        const url = await gatewayPhoto(id);
        if (!url) continue;
        created.push(url);
        next[id] = url;
      }
      if (!cancelled) setPhotos(next);
    })();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [records]);

  function setDraftField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const serials = [...new Set([
    ...devices.map((device) => device.serialNumber),
    ...records.map((row) => row.device_serial_num),
  ].filter(Boolean))];

  const visible = records.filter((row) => {
    if (applied.device !== "all" && row.device_serial_num !== applied.device) return false;
    if (applied.enroll && !String(row.enroll_id).includes(applied.enroll.trim())) return false;
    const day = dayOf(row.records_time);
    if (applied.from && day < applied.from) return false;
    if (applied.to && day > applied.to) return false;
    return true;
  });

  return (
    <>
      <div className="toolbar">
        <h1>Attendance</h1>
        <div className="trail">
          <Button icon={Download} onClick={() => exportCsv(visible)} disabled={visible.length === 0}>Export</Button>
          <RefreshButton onClick={load} />
        </div>
      </div>
      <form
        className="panel filter-card"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(draft);
        }}
      >
        <label>Device
          <select value={draft.device} onChange={(event) => setDraftField("device", event.target.value)}>
            <option value="all">All devices</option>
            {serials.map((serial) => <option key={serial} value={serial}>{serial}</option>)}
          </select>
        </label>
        <label>Enroll ID
          <input value={draft.enroll} onChange={(event) => setDraftField("enroll", event.target.value)} placeholder="e.g. 101" />
        </label>
        <label>From
          <input type="date" value={draft.from} onChange={(event) => setDraftField("from", event.target.value)} />
        </label>
        <label>To
          <input type="date" value={draft.to} onChange={(event) => setDraftField("to", event.target.value)} />
        </label>
        <Button variant="primary" type="submit" icon={Filter}>Filter</Button>
      </form>
      <p className="lead">{visible.length} of {records.length} punches. Device clock. Gateway time: {serverTime || "—"}</p>
      <DataTable
        rows={visible}
        rowKey={(row) => row.id}
        empty="No punches match this filter."
        columns={[
          { key: "enroll", header: "Enroll ID", render: (row) => row.enroll_id },
          { key: "name", header: "Name", render: (row) => row.name || "—" },
          { key: "device", header: "Device serial", render: (row) => row.device_serial_num },
          { key: "time", header: "Timestamp", render: (row) => formatStamp(row.records_time) },
          { key: "mode", header: "Mode", render: (row) => <span className="ok mode-pill">{row.verifyMethod || "Mode"} ({row.mode})</span> },
          { key: "way", header: "In / out", render: (row) => Number(row.intOut) === 1 ? "Out" : "In" },
          { key: "temp", header: "Temp", render: (row) => Number(row.temperature) > 0 ? row.temperature : "—" },
          { key: "photo", header: "Photo", render: (row) => photos[row.enroll_id] ? (
            <Button variant="plain" className="face-btn" onClick={() => setPreview({ src: photos[row.enroll_id], caption: `${row.name || "Enroll"} · ${row.enroll_id}` })}>
              <img className="face" src={photos[row.enroll_id]} alt="" />
            </Button>
          ) : "—" },
          { key: "webhook", header: "Webhook", render: () => <span className="muted">N/A</span> },
        ]}
      />
      {preview ? (
        <div className="lightbox" onClick={() => setPreview(null)} role="presentation">
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={preview.src} alt="" />
            <figcaption>{preview.caption}</figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}
