import { useEffect, useState } from "react";
import { gateway } from "../api.js";
import { onLiveEvent } from "../live.js";
import FilterBar, { matchText } from "../FilterBar.jsx";
import { RefreshButton } from "../ui.jsx";
import DataTable from "../DataTable.jsx";

const COMMAND_LABELS = {
  settime: "Sync time",
  getdevinfo: "Read device info",
  getnewlog: "Pull new punches",
  getalllog: "Pull all punches",
  opendoor: "Open door",
  reboot: "Reboot",
  setusername: "Push name",
  setuserinfo: "Push user",
  getuserlist: "Read user list",
  getuserinfo: "Read user template",
  deleteuser: "Delete user",
};

function stateOf(row) {
  if (row.status === 1) return { label: "Done", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" };
  if (row.sendStatus === 1) return { label: "Sent, waiting", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" };
  return { label: "Queued", className: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-200" };
}

export default function Monitor({ notify }) {
  const [commands, setCommands] = useState([]);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  async function load() {
    try {
      const json = await gateway("/api/commands");
      setCommands(json.commands || []);
      notify("");
    } catch (error) {
      notify(error.message);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => onLiveEvent(() => load()), []);

  const visible = commands.filter((row) => {
    const state = stateOf(row).label;
    if (stateFilter !== "all" && state !== stateFilter) return false;
    return matchText(query, row.serialNumber, row.name, COMMAND_LABELS[row.name], state);
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <FilterBar
        query={query}
        onQuery={setQuery}
        placeholder="Device or command"
        leading={<h1>Communication</h1>}
        trailing={<RefreshButton onClick={load} />}
      >
        <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
          <option value="all">All states</option>
          <option value="Queued">Queued</option>
          <option value="Sent, waiting">Sent, waiting</option>
          <option value="Done">Done</option>
        </select>
        <span className="text-xs text-mute">{visible.length} of {commands.length}</span>
      </FilterBar>
      <DataTable
        rows={visible}
        rowKey={(row) => row.id}
        empty="No commands match this filter."
        columns={[
          { key: "when", header: "When", render: (row) => row.createdAt },
          { key: "device", header: "Device", render: (row) => row.serialNumber },
          { key: "command", header: "Command", render: (row) => COMMAND_LABELS[row.name] || row.name },
          { key: "state", header: "State", render: (row) => {
            const state = stateOf(row);
            return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${state.className}`}>{state.label}</span>;
          } },
          { key: "retries", header: "Retries", render: (row) => row.errorCount || 0 },
        ]}
      />
    </div>
  );
}
