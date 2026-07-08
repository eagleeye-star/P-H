import React, { useState, useEffect } from "react";
import { supabase, useLive } from "./supabaseClient";
import "./admin.css";

const cedis = (n) => "GH₵ " + Number(n || 0).toLocaleString("en-GH");
const CATEGORIES = ["Audio", "Wearables", "Phones", "Home", "Gadgets", "Lifestyle"];
const STATUSES = ["new", "pending", "paid", "review", "shipped", "delivered", "cancelled"];
const STATUS_COLORS = {
  new: "#6C3BF5", pending: "#d9820a", paid: "#12A37A", review: "#e0397a",
  shipped: "#2b7fff", delivered: "#0f8f6c", cancelled: "#8a8598",
};

function Icon({ name, size = 18, sw = 2 }) {
  const p = {
    list: (<><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>),
    bag: (<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>),
    refresh: (<><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>),
    out: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>),
    plus: (<><path d="M12 5v14" /><path d="M5 12h14" /></>),
    edit: (<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>),
    trash: (<><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
    x: (<><path d="M18 6 6 18" /><path d="M6 6l12 12" /></>),
    chevron: <path d="m6 9 6 6 6-6" />,
  };
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{p[name]}</svg>);
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState("orders");

  useEffect(() => {
    if (!useLive) { setChecking(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!useLive) return <div className="adm adm-center"><p>Connect Supabase (environment variables) to use the admin panel.</p></div>;
  if (checking) return <div className="adm adm-center"><div className="adm-spin" /></div>;
  if (!session) return <Login />;

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-brand">Prime<b>Haul</b> <span>Admin</span></div>
        <div className="adm-user">
          <span>{session.user.email}</span>
          <button onClick={() => supabase.auth.signOut()}><Icon name="out" size={16} /> Sign out</button>
        </div>
      </header>
      <nav className="adm-tabs">
        <button className={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}><Icon name="list" size={16} /> Orders</button>
        <button className={tab === "products" ? "on" : ""} onClick={() => setTab("products")}><Icon name="bag" size={16} /> Products</button>
      </nav>
      <main className="adm-main">{tab === "orders" ? <Orders /> : <Products />}</main>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) setErr(error.message);
    setBusy(false);
  }
  return (
    <div className="adm adm-center">
      <div className="adm-login">
        <div className="adm-brand adm-brand-lg">Prime<b>Haul</b> <span>Admin</span></div>
        <p className="adm-sub">Sign in to manage orders and products.</p>
        <input className="adm-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="adm-input" type="password" placeholder="Password" value={pw}
          onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        {err && <div className="adm-err">{err}</div>}
        <button className="adm-btn adm-btn-primary adm-full" onClick={submit} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </div>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (!error) setOrders(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    await supabase.from("orders").update({ status }).eq("id", id);
  }

  const shown = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const revenue = orders.filter((o) => ["paid", "shipped", "delivered"].includes(o.status)).reduce((s, o) => s + Number(o.subtotal || 0), 0);
  const pending = orders.filter((o) => o.status === "pending" || o.status === "new").length;

  return (
    <div>
      <div className="adm-cards">
        <div className="adm-stat"><span>Total orders</span><b>{orders.length}</b></div>
        <div className="adm-stat"><span>Paid revenue</span><b>{cedis(revenue)}</b></div>
        <div className="adm-stat"><span>Awaiting action</span><b>{pending}</b></div>
        <button className="adm-refresh" onClick={load}><Icon name="refresh" size={16} /> Refresh</button>
      </div>

      <div className="adm-filters">
        {["all", ...STATUSES].map((s) => (
          <button key={s} className={"adm-chip" + (filter === s ? " on" : "")} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>

      {loading ? <div className="adm-spin" /> : shown.length === 0 ? (
        <p className="adm-empty">No orders{filter !== "all" ? ` with status "${filter}"` : ""} yet.</p>
      ) : (
        <div className="adm-orders">
          {shown.map((o) => {
            const items = Array.isArray(o.items) ? o.items : [];
            const isOpen = open[o.id];
            return (
              <div key={o.id} className="adm-order">
                <div className="adm-order-head" onClick={() => setOpen((v) => ({ ...v, [o.id]: !v[o.id] }))}>
                  <div className="adm-order-ref">
                    <b>{o.ref}</b>
                    <span className="adm-badge" style={{ background: STATUS_COLORS[o.status] || "#888" }}>{o.status}</span>
                    <span className="adm-chan">{o.channel}</span>
                  </div>
                  <div className="adm-order-meta">
                    <span>{o.customer_name || "—"}</span>
                    <b>{cedis(o.subtotal)}</b>
                    <span className={"adm-caret" + (isOpen ? " open" : "")}><Icon name="chevron" size={16} /></span>
                  </div>
                </div>
                {isOpen && (
                  <div className="adm-order-body">
                    <div className="adm-order-contact">
                      <div><label>Phone</label>{o.phone || "—"}</div>
                      <div><label>Email</label>{o.email || "—"}</div>
                      <div><label>Area</label>{o.area || "—"}</div>
                      <div><label>Placed</label>{new Date(o.created_at).toLocaleString()}</div>
                    </div>
                    <div className="adm-items">
                      {items.map((it, idx) => (
                        <div key={idx} className="adm-item"><span>{it.qty} × {it.name}</span><span>{cedis(it.qty * it.price)}</span></div>
                      ))}
                    </div>
                    <div className="adm-status-row">
                      <label>Update status</label>
                      <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: true });
    if (!error) setProducts(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(p) {
    await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    load();
  }
  async function remove(p) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await supabase.from("products").delete().eq("id", p.id);
    load();
  }

  return (
    <div>
      <div className="adm-prod-head">
        <div className="adm-cards-inline">
          <div className="adm-stat sm"><span>Products</span><b>{products.length}</b></div>
          <div className="adm-stat sm"><span>Active</span><b>{products.filter((p) => p.active).length}</b></div>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => setEditing({})}><Icon name="plus" size={16} /> Add product</button>
      </div>

      {loading ? <div className="adm-spin" /> : (
        <div className="adm-table-wrap">
          <div className="adm-table">
            <div className="adm-tr adm-th">
              <span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Active</span><span></span>
            </div>
            {products.map((p) => (
              <div key={p.id} className="adm-tr">
                <span className="adm-pname">{p.image_url ? <img src={p.image_url} alt="" /> : <em>{p.emoji || "📦"}</em>}{p.name}</span>
                <span>{p.category}</span>
                <span>{cedis(p.price)}</span>
                <span className={p.stock <= 0 ? "adm-out" : p.stock <= 5 ? "adm-low" : ""}>{p.stock}</span>
                <span><button className={"adm-toggle" + (p.active ? " on" : "")} onClick={() => toggleActive(p)}><i /></button></span>
                <span className="adm-row-actions">
                  <button onClick={() => setEditing(p)}><Icon name="edit" size={15} /></button>
                  <button onClick={() => remove(p)}><Icon name="trash" size={15} /></button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && <ProductForm product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function ProductForm({ product, onClose, onSaved }) {
  const isNew = !product.id;
  const [f, setF] = useState({
    name: product.name || "", category: product.category || "Audio",
    price: product.price ?? "", was_price: product.was_price ?? "",
    stock: product.stock ?? 0, emoji: product.emoji || "", image_url: product.image_url || "",
    active: product.active !== undefined ? product.active : true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!f.name.trim() || f.price === "") { setErr("Name and price are required."); return; }
    setBusy(true); setErr("");
    const payload = {
      name: f.name.trim(), category: f.category,
      price: Number(f.price), was_price: f.was_price === "" ? null : Number(f.was_price),
      stock: Number(f.stock) || 0, emoji: f.emoji.trim() || null,
      image_url: f.image_url.trim() || null, active: !!f.active,
    };
    let error;
    if (isNew) ({ error } = await supabase.from("products").insert(payload));
    else ({ error } = await supabase.from("products").update(payload).eq("id", product.id));
    setBusy(false);
    if (error) setErr(error.message); else onSaved();
  }

  return (
    <div className="adm-modal-bg" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal-head">
          <h3>{isNew ? "Add product" : "Edit product"}</h3>
          <button onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="adm-form">
          <label>Name<input value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
          <div className="adm-form-2">
            <label>Category
              <select value={f.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Stock<input type="number" value={f.stock} onChange={(e) => set("stock", e.target.value)} /></label>
          </div>
          <div className="adm-form-2">
            <label>Price (GH₵)<input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} /></label>
            <label>Was price (optional)<input type="number" value={f.was_price} onChange={(e) => set("was_price", e.target.value)} /></label>
          </div>
          <div className="adm-form-2">
            <label>Emoji (fallback)<input value={f.emoji} onChange={(e) => set("emoji", e.target.value)} placeholder="🎧" /></label>
            <label className="adm-check">Active
              <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} />
            </label>
          </div>
          <label>Image URL<input value={f.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" /></label>
          {err && <div className="adm-err">{err}</div>}
        </div>
        <div className="adm-modal-foot">
          <button className="adm-btn" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
