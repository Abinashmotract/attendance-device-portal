import { useEffect, useState } from "react";
import { gateway } from "../api.js";
import { onLiveEvent } from "../live.js";
import FilterBar, { matchText } from "../FilterBar.jsx";
import { Button, RefreshButton } from "../ui.jsx";
import DataTable from "../DataTable.jsx";

export default function Access({ notify }) {
  const [days, setDays] = useState([]);
  const [commands, setCommands] = useState([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("days");

  async function load() {
    try {
      const [access, queued] = await Promise.all([
        gateway("/api/access-days"),
        gateway("/api/commands"),
      ]);
      setDays(access.accessDays || []);
      setCommands(queued.commands || []);
      notify("");
    } catch (error) {
      notify(error.message);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => onLiveEvent(() => load()), []);

  const visibleDays = days.filter((day) => matchText(query, day.name, day.serial));
  const visibleCommands = commands.filter((command) => matchText(query, command.serialNumber, command.name, command.status));

  return (
    <>
      <FilterBar
        query={query}
        onQuery={setQuery}
        placeholder="Schedule, device, or command"
        leading={<h1>Access</h1>}
        trailing={<RefreshButton onClick={load} />}
      />
      <p className="lead">Day schedules stored on the gateway, and the latest commands waiting for a device.</p>
      <div className="tabs">
        <Button variant="plain" className={tab === "days" ? "active" : ""} onClick={() => setTab("days")}>Access days</Button>
        <Button variant="plain" className={tab === "commands" ? "active" : ""} onClick={() => setTab("commands")}>Command queue</Button>
      </div>
      {tab === "days" ? (
        <DataTable
          rows={visibleDays}
          rowKey={(day) => day.id}
          empty="No access day matches this filter."
          columns={[
            { key: "name", header: "Name" },
            { key: "serial", header: "Serial" },
            { key: "period", header: "Period 1", render: (day) => `${day.startTime1 || "—"} – ${day.endTime1 || "—"}` },
          ]}
        />
      ) : (
        <DataTable
          rows={visibleCommands}
          rowKey={(command) => command.id}
          empty="No commands match this filter."
          columns={[
            { key: "id", header: "Id" },
            { key: "serialNumber", header: "Device" },
            { key: "name", header: "Command" },
            { key: "status", header: "Status", render: (command) => command.status === 0 ? "Waiting" : "Sent" },
            { key: "createdAt", header: "Created" },
          ]}
        />
      )}
    </>
  );
}
