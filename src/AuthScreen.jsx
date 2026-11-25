import { useEffect, useState } from "react";
import { Clock3, Eye, EyeOff, Fingerprint, ScanFace } from "lucide-react";
import { gateway, saveSession } from "./api.js";
import { Button } from "./ui.jsx";

const PUNCHES = [
  { name: "Gate", way: "In", method: "Face" },
  { name: "Lobby", way: "Out", method: "Fingerprint" },
  { name: "Gate", way: "In", method: "Face" },
];

export default function AuthScreen({ notify, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const json = await gateway(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        body: { name, email, password },
      });
      saveSession(json.token, json.user);
      onSuccess(json.user);
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-stage">
        <div className="auth-live">
          <Clock3 size={14} />
          <strong>{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong>
          <span>Live terminal</span>
        </div>
        <div className="auth-device">
          <span className="auth-scan" />
          <div className="auth-orbit">
            <span className="auth-ring" />
            <span className="auth-ring slow" />
            <Fingerprint size={28} />
          </div>
          <p>Attendance gateway</p>
        </div>
        <ul className="auth-punches">
          {PUNCHES.map((punch, index) => (
            <li key={`${punch.name}-${index}`} style={{ animationDelay: `${index * 1.6}s` }}>
              <ScanFace size={14} />
              <span>{punch.name}</span>
              <em>{punch.method}</em>
              <strong className={punch.way === "In" ? "in" : "out"}>{punch.way}</strong>
            </li>
          ))}
        </ul>
      </aside>
      <form className="auth-card" onSubmit={submit}>
        <span className="auth-mark">AT</span>
        <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p className="meta">
          {mode === "login"
            ? "Use the email and password for this attendance portal."
            : "The first account becomes the admin. Later accounts are users."}
        </p>
        <div className="mode-switch">
          <Button variant="plain" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</Button>
          <Button variant="plain" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</Button>
        </div>
        <div className="auth-fields" key={mode}>
          {mode === "signup" ? (
            <label>Name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
            </label>
          ) : null}
          <label>Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" required />
          </label>
          <label>Password
            <span className="secret-line">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                required
              />
              <Button icon={showPassword ? EyeOff : Eye} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} />
            </span>
          </label>
        </div>
        <Button variant="primary" type="submit" disabled={busy}>{busy ? "Please wait" : mode === "login" ? "Sign in" : "Create account"}</Button>
      </form>
    </div>
  );
}
