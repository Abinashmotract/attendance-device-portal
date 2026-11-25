import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function Button({ variant = "tool", icon: Icon, iconClassName = "", className = "", type = "button", children, ...props }) {
  const named = variant === "primary" ? "primary" : variant === "icon" ? "icon-btn" : variant === "plain" ? "" : "tool-btn";
  return (
    <button type={type} className={[named, className].filter(Boolean).join(" ")} {...props}>
      {Icon ? <Icon size={14} className={iconClassName} /> : null}
      {children}
    </button>
  );
}

export function RefreshButton({ onClick, disabled }) {
  const [spinning, setSpinning] = useState(false);

  async function click() {
    if (spinning) return;
    setSpinning(true);
    const started = Date.now();
    try {
      await onClick();
    } finally {
      const remain = Math.max(0, 700 - (Date.now() - started));
      window.setTimeout(() => setSpinning(false), remain);
    }
  }

  return (
    <Button icon={RefreshCw} iconClassName={spinning ? "spin" : ""} onClick={click} disabled={disabled || spinning}>
      Refresh
    </Button>
  );
}
