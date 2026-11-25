import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { gateway, gatewayPhoto } from "../api.js";
import FilterBar, { matchText } from "../FilterBar.jsx";
import { RefreshButton } from "../ui.jsx";
import DataTable from "../DataTable.jsx";
import { Button } from "../ui.jsx";

const empty = { enrollId: "", name: "", privilege: "0", cardNum: "", password: "", deviceSn: "", push: true };

export default function People() {
  const [people, setPeople] = useState([]);
  const [photos, setPhotos] = useState({});
  const [form, setForm] = useState(empty);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [preview, setPreview] = useState(null);
  const [tab, setTab] = useState("list");
  const [editing, setEditing] = useState(false);

  function toastOk(message) {
    toast.success(message);
  }

  function toastErr(message) {
    toast.error(message || "Something went wrong");
  }

  async function load() {
    try {
      const json = await gateway("/api/persons");
      setPeople(json.persons || []);
    } catch (error) {
      toastErr(error.message);
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

  useEffect(() => {
    const ids = people.filter((person) => person.hasPhoto).map((person) => person.enrollId);
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
  }, [people]);

  const visible = people.filter((person) => {
    if (role === "admin" && !person.privilege) return false;
    if (role === "user" && person.privilege) return false;
    return matchText(query, person.name, person.enrollId, (person.enrolled || []).join(" "));
  });

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    try {
      await gateway("/api/persons", {
        method: "POST",
        body: {
          enrollId: Number(form.enrollId),
          name: form.name,
          privilege: Number(form.privilege || 0),
          cardNum: form.cardNum,
          password: form.password,
          deviceSn: form.deviceSn,
          push: form.push && Boolean(form.deviceSn),
        },
      });
      toastOk(editing ? "Person updated." : "Person saved. A device serial queues a push.");
      setForm(empty);
      setEditing(false);
      setTab("list");
      await load();
    } catch (error) {
      toastErr(error.message);
    }
  }

  function startAdd() {
    setForm(empty);
    setEditing(false);
    setTab("add");
  }

  function startEdit(person) {
    setForm({
      enrollId: String(person.enrollId),
      name: person.name || "",
      privilege: person.privilege ? "1" : "0",
      cardNum: "",
      password: "",
      deviceSn: "",
      push: false,
    });
    setEditing(true);
    setTab("add");
  }

  async function remove(person) {
    const deviceSn = window.prompt("Device serial to also delete from the terminal. Leave blank to remove only from this gateway.");
    if (deviceSn === null) return;
    try {
      await gateway("/api/persons/delete", { method: "POST", body: { enrollId: person.enrollId, deviceSn, local: true } });
      toastOk(deviceSn.trim() ? `Removed ${person.name || person.enrollId} and queued a device delete.` : `Removed ${person.name || person.enrollId} from this gateway.`);
      await load();
    } catch (error) {
      toastErr(error.message);
    }
  }

  return (
    <>
      <div className="toolbar">
        <h1>People</h1>
        <div className="trail">
          <Button variant="primary" icon={Plus} onClick={startAdd}>Add</Button>
          <RefreshButton onClick={load} />
        </div>
      </div>
      <Toaster position="top-right" toastOptions={{ duration: 3200 }} />
      <div className="tabs">
        <Button variant="plain" className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>People</Button>
        <Button variant="plain" className={tab === "add" ? "active" : ""} onClick={() => setTab("add")}>{editing ? "Edit person" : "Add person"}</Button>
      </div>
      {tab === "add" ? (
        <form className="panel form" onSubmit={save}>
          <p className="meta">Card is backup 11, password is backup 10. A device serial queues a push to that terminal.</p>
          <label>Enroll id<input value={form.enrollId} onChange={(e) => set("enrollId", e.target.value)} required readOnly={editing} /></label>
          <label>Name<input value={form.name} onChange={(e) => set("name", e.target.value)} required /></label>
          <label>Card number<input value={form.cardNum} onChange={(e) => set("cardNum", e.target.value)} /></label>
          <label>Password<input value={form.password} onChange={(e) => set("password", e.target.value)} /></label>
          <label>Device serial<input value={form.deviceSn} onChange={(e) => set("deviceSn", e.target.value)} placeholder="Optional, to push now" /></label>
          <label>Privilege
            <select value={form.privilege} onChange={(e) => set("privilege", e.target.value)}>
              <option value="0">User</option>
              <option value="1">Admin</option>
            </select>
          </label>
          <Button variant="primary" type="submit">{editing ? "Update person" : "Save person"}</Button>
        </form>
      ) : (
        <>
      <FilterBar query={query} onQuery={setQuery} placeholder="Name or enroll id">
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="all">All types</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <span className="muted">{visible.length} of {people.length}</span>
      </FilterBar>
      <DataTable
        rows={visible}
        rowKey={(person) => person.enrollId}
        empty="No people match this filter."
        columns={[
          { key: "photo", header: "Photo", render: (person) => photos[person.enrollId] ? (
            <Button variant="plain" className="face-btn" onClick={() => setPreview({ src: photos[person.enrollId], caption: `${person.name || "Enroll"} · ${person.enrollId}` })}>
              <img className="face" src={photos[person.enrollId]} alt="" />
            </Button>
          ) : "—" },
          { key: "enroll", header: "Enroll id", render: (person) => person.enrollId },
          { key: "name", header: "Name", render: (person) => person.name || "—" },
          { key: "type", header: "User type", render: (person) => person.privilege ? "Admin" : "User" },
          { key: "enrolled", header: "Enrolled on device", render: (person) => (person.enrolled || []).join(", ") || "—" },
          { key: "action", header: "", render: (person) => (
            <div className="row">
              <Button icon={Pencil} onClick={() => startEdit(person)}>Edit</Button>
              <Button icon={Trash2} onClick={() => remove(person)}>Delete</Button>
            </div>
          ) },
        ]}
      />
        </>
      )}
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
