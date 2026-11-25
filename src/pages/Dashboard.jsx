import { useEffect, useState } from "react";
import { gateway } from "../api.js";
import { onLiveEvent } from "../live.js";
import FilterBar, { matchText } from "../FilterBar.jsx";
import { RefreshButton } from "../ui.jsx";
import DataTable from "../DataTable.jsx";

export default function Dashboard({ notify }) {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("all");

  async function load() {
    try {
      const json = await gateway("/api/dashboard");
      setData(json);
      notify(json.database ? "" : "The gateway is up, but the fingerprint database is not connected. Device commands cannot be saved until MySQL accepts the user in config/set.conf.");
    } catch (error) {
      setData(null);
      notify(error.message);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => onLiveEvent((event) => {
    if (event.type === "punch" || event.type === "device") load();
  }), []);

  const recent = (data?.recent || []).filter((row) => {
    const way = Number(row.intOut) === 1 ? "out" : "in";
    if (direction !== "all" && way !== direction) return false;
    return matchText(query, row.name, row.enroll_id, row.device_serial_num, row.verifyMethod);
  });

  return (
    <>
      <div className="toolbar">
        <h1>Dashboard</h1>
        <div className="trail"><RefreshButton onClick={load} /></div>
      </div>
      <p className="lead">Live attendance from the terminals connected to this gateway.</p>
      <div className="grid">
        <div className="card"><span>Online devices</span><strong>{data?.onlineDevices ?? "—"}</strong></div>
        <div className="card"><span>People</span><strong>{data?.people ?? "—"}</strong></div>
        <div className="card"><span>Punches today</span><strong>{data?.todayPunches ?? "—"}</strong></div>
        <div className="card"><span>All stored punches</span><strong>{data?.punches ?? "—"}</strong></div>
      </div>
      <h2 className="section-title">Latest activity</h2>
      <FilterBar query={query} onQuery={setQuery} placeholder="Name, enroll id, or device">
          <select value={direction} onChange={(event) => setDirection(event.target.value)}>
            <option value="all">All directions</option>
            <option value="in">In</option>
            <option value="out">Out</option>
          </select>
        </FilterBar>
        <DataTable
          rows={recent}
          rowKey={(row) => row.id}
          empty="No punches match this filter."
          columns={[
            { key: "time", header: "Time", render: (row) => row.records_time },
            { key: "name", header: "Name", render: (row) => row.name || "—" },
            { key: "enroll", header: "Enroll id", render: (row) => row.enroll_id },
            { key: "device", header: "Device", render: (row) => row.device_serial_num },
            { key: "way", header: "Direction", render: (row) => Number(row.intOut) === 1 ? "Out" : "In" },
            { key: "method", header: "Method", render: (row) => row.verifyMethod || row.mode },
          ]}
        />
      <p className="muted">Gateway time: {data?.serverTime || "—"} · Database: <span className={data?.database ? "ok" : "bad"}>{data?.database ? "Connected" : "Not connected"}</span></p>
    </>
  );
}
