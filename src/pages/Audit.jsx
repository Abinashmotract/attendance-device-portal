import { useEffect, useState } from "react";
import { gateway } from "../api.js";
import FilterBar, { matchText } from "../FilterBar.jsx";
import { Button, RefreshButton } from "../ui.jsx";
import DataTable from "../DataTable.jsx";

const COLUMNS = [
  { key: "at", header: "Time", render: (row) => row.at },
  { key: "user", header: "User", render: (row) => row.user || "—" },
  { key: "role", header: "Role", render: (row) => row.role || "—" },
  { key: "module", header: "Module", render: (row) => row.module },
  { key: "action", header: "Action", render: (row) => row.action },
  { key: "detail", header: "Detail", render: (row) => row.detail || "—" },
  { key: "status", header: "Result", render: (row) => row.status || "—" },
];

export default function Audit({ notify }) {
  const [logs, setLogs] = useState([]);
  const [modules, setModules] = useState([]);
  const [roleView, setRoleView] = useState("");
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("all");
  const [role, setRole] = useState("all");
  const [view, setView] = useState("all");

  async function load() {
    try {
      const json = await gateway("/api/audit");
      setLogs(json.logs || []);
      setModules(json.modules || []);
      setRoleView(json.role || "");
    } catch (error) {
      notify(error.message);
    }
  }

  useEffect(() => { load(); }, []);

  const visible = logs.filter((row) => {
    if (module !== "all" && row.module !== module) return false;
    if (role !== "all" && row.role !== role) return false;
    return matchText(query, row.user, row.email, row.module, row.action, row.detail, row.role);
  });
  const grouped = (modules.length ? modules : [...new Set(visible.map((row) => row.module))])
    .map((name) => ({ name, rows: visible.filter((row) => row.module === name) }))
    .filter((group) => group.rows.length);

  return (
    <>
      <FilterBar
        query={query}
        onQuery={setQuery}
        placeholder="User, module, or action"
        leading={<h1>Audit log</h1>}
        trailing={<RefreshButton onClick={load} />}
      >
        <select value={module} onChange={(event) => setModule(event.target.value)}>
          <option value="all">All modules</option>
          {modules.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </FilterBar>
      <p className="lead">
        {roleView === "admin"
          ? "Every saved action, grouped by module. Admins see user and admin activity."
          : "Your own activity, grouped by module."}
      </p>
      <div className="tabs">
        <Button variant="plain" className={view === "all" ? "active" : ""} onClick={() => setView("all")}>All logs</Button>
        <Button variant="plain" className={view === "group" ? "active" : ""} onClick={() => setView("group")}>Grouped by module</Button>
      </div>
      {view === "all" ? (
        <DataTable rows={visible} rowKey={(row) => row.id} empty="No activity matches this filter." columns={COLUMNS} />
      ) : grouped.length === 0 ? (
        <section className="panel">No activity matches this filter.</section>
      ) : grouped.map((group) => (
        <section key={group.name}>
          <h2 className="section-title">{group.name} · {group.rows.length}</h2>
          <DataTable rows={group.rows} rowKey={(row) => row.id} empty="Nothing in this module." columns={COLUMNS} />
        </section>
      ))}
    </>
  );
}
