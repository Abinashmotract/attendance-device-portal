import { useEffect, useState } from "react";
import { BookOpen, CalendarCheck, ClipboardList, Clock3, Cpu, Globe, KeyRound, LayoutDashboard, LogOut, Moon, Radio, Settings as SettingsIcon, Sun, Users, Wifi } from "lucide-react";
import { clearSession, gateway, loadSession } from "./api.js";
import { connectLive, disconnectLive, onLiveStatus } from "./live.js";
import { Button } from "./ui.jsx";
import AuthScreen from "./AuthScreen.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Devices from "./pages/Devices.jsx";
import People from "./pages/People.jsx";
import Attendance from "./pages/Attendance.jsx";
import Monitor from "./pages/Monitor.jsx";
import Access from "./pages/Access.jsx";
import Settings from "./pages/Settings.jsx";
import ApiDocs from "./pages/ApiDocs.jsx";
import Audit from "./pages/Audit.jsx";

const GROUPS = [
  ["Floor", [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["attendance", "Attendance", CalendarCheck],
    ["people", "People", Users],
  ]],
  ["Terminals", [
    ["devices", "Devices", Cpu],
    ["monitor", "Communication", Radio],
    ["access", "Access", KeyRound],
  ]],
  ["Setup", [
    ["settings", "Settings", SettingsIcon],
    ["audit", "Audit log", ClipboardList],
    ["docs", "API Docs", BookOpen],
  ]],
];

const THEME_KEY = "attendance-theme";

function clockParts(date) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  return {
    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    date: date.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short", year: "numeric" }),
    zone,
    region: zone.includes("/") ? zone.split("/")[0] : zone,
    offset: `UTC${sign}${hours}:${minutes}`,
  };
}

const PAGE_MODULE = {
  dashboard: "Dashboard",
  attendance: "Attendance",
  people: "People",
  devices: "Devices",
  monitor: "Communication",
  access: "Access",
  settings: "Settings",
  audit: "Audit",
  docs: "API Docs",
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  const [live, setLive] = useState(false);
  const [clock, setClock] = useState(() => clockParts(new Date()));
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const Current = {
    dashboard: Dashboard,
    devices: Devices,
    people: People,
    attendance: Attendance,
    monitor: Monitor,
    access: Access,
    settings: Settings,
    audit: Audit,
    docs: ApiDocs,
  }[page];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const saved = loadSession();
    if (!saved?.token) {
      setReady(true);
      return;
    }
    gateway("/api/auth/me")
      .then((json) => setUser(json.user))
      .catch(() => { clearSession(); setUser(null); })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!user) {
      disconnectLive();
      return undefined;
    }
    connectLive();
    return onLiveStatus(setLive);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    gateway("/api/audit", {
      method: "POST",
      body: { module: PAGE_MODULE[page] || "Gateway", action: "Opened page", detail: PAGE_MODULE[page] || page },
    }).catch(() => {});
    return undefined;
  }, [page, user]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(clockParts(new Date())), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function logout() {
    try {
      await gateway("/api/auth/logout", { method: "POST", body: {} });
    } catch {
      /* The local session still ends. */
    }
    clearSession();
    setUser(null);
    setNotice("");
  }

  if (!ready) {
    return <div className="auth-screen"><p className="meta">Checking the saved session.</p></div>;
  }
  if (!user) {
    return (
      <>
        {notice ? <div className="auth-note">{notice}</div> : null}
        <AuthScreen notify={setNotice} onSuccess={(next) => { setNotice(""); setUser(next); }} />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink">
      <aside className="flex w-[200px] shrink-0 flex-col gap-2 overflow-auto bg-side px-2.5 py-3 text-[#f6f1e7]">
        <div className="flex items-center gap-2 px-1.5 pb-1">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gold text-xs font-bold text-[#1c1406]">AT</span>
          <span>
            <strong className="block text-sm">Attendance</strong>
            <small className="block text-[11px] text-[#b7b1a6]">Terminal gateway</small>
          </span>
        </div>
        {GROUPS.map(([label, items]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <p className="mx-2 mb-0.5 text-[10px] uppercase tracking-[0.08em] text-[#8d877c]">{label}</p>
            {items.map(([id, name, Icon]) => (
              <Button
                key={id}
                variant="plain"
                icon={Icon}
                onClick={() => setPage(id)}
                className={`nav-link ${page === id ? "active" : ""}`}
              >
                {name}
              </Button>
            ))}
          </div>
        ))}
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-4 border-b border-line bg-card px-4">
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm">
            <Clock3 size={15} className="text-mute" />
            <strong>{clock.time}</strong>
            <span className="text-mute">{clock.date}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-mute">
            <Globe size={15} />
            <span>{clock.zone}</span>
            <span>{clock.offset}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${live ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200"}`}>
              <Wifi size={12} />
              {live ? "Live" : "Reconnecting"}
            </span>
            <span className="text-sm text-mute">{user.name} · {user.role}</span>
            <Button icon={theme === "dark" ? Sun : Moon} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <Button icon={LogOut} onClick={logout}>Log out</Button>
          </div>
        </header>
        {notice ? <div className="mx-4 mt-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">{notice}</div> : null}
        <main className="page">
          <Current notify={setNotice} />
        </main>
      </div>
    </div>
  );
}
