import { Search } from "lucide-react";

export function matchText(query, ...parts) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => String(part ?? "").toLowerCase().includes(needle));
}

export default function FilterBar({ query, onQuery, placeholder = "Search", leading, trailing, children }) {
  return (
    <div className="toolbar">
      {leading}
      <label className="search">
        <Search size={14} />
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={placeholder}
        />
      </label>
      {children}
      {trailing ? <div className="trail">{trailing}</div> : null}
    </div>
  );
}
