import React, { useState, useMemo, useEffect } from "react";
import { supabase as sb, useLive } from "./supabaseClient";

/* ---- Config from environment variables ---- */
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
const WHATSAPP = "233597414760"; // 0597414760 in international format
const LOW_STOCK = 5;

const paystackReady = !!PAYSTACK_PUBLIC_KEY;

const SAMPLE = [
  { id: "s1", name: "Wireless Earbuds Pro", category: "Audio", price: 189, was_price: 260, emoji: "🎧", stock: 24 },
  { id: "s2", name: "Smart Watch Series 9", category: "Wearables", price: 349, was_price: 450, emoji: "⌚", stock: 12 },
  { id: "s3", name: "20,000mAh Power Bank", category: "Phones", price: 145, was_price: null, emoji: "🔋", stock: 40 },
  { id: "s4", name: "Boom Bluetooth Speaker", category: "Audio", price: 220, was_price: null, emoji: "🔊", stock: 8 },
  { id: "s5", name: '10" LED Ring Light', category: "Lifestyle", price: 130, was_price: null, emoji: "💡", stock: 30 },
  { id: "s6", name: "65W GaN Fast Charger", category: "Phones", price: 95, was_price: 140, emoji: "⚡", stock: 3 },
  { id: "s7", name: "Mini Portable Blender", category: "Home", price: 175, was_price: null, emoji: "🥤", stock: 15 },
  { id: "s8", name: "Wireless Gaming Mouse", category: "Gadgets", price: 120, was_price: null, emoji: "🖱️", stock: 20 },
  { id: "s9", name: "Phone Tripod Stand", category: "Lifestyle", price: 85, was_price: null, emoji: "📷", stock: 0 },
  { id: "s10", name: "Rechargeable Fan", category: "Home", price: 210, was_price: null, emoji: "🌀", stock: 6 },
  { id: "s11", name: "Fitness Band", category: "Wearables", price: 160, was_price: null, emoji: "📿", stock: 18 },
  { id: "s12", name: "6-in-1 USB-C Hub", category: "Gadgets", price: 240, was_price: null, emoji: "🔌", stock: 9 },
];

const cedis = (n) => "GH₵ " + Number(n).toLocaleString("en-GH");
const genRef = () => "PH-" + Math.random().toString(36).slice(2, 7).toUpperCase();

function Icon({ name, size = 20, sw = 2 }) {
  const p = {
    bag: (<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>),
    search: (<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>),
    plus: (<><path d="M12 5v14" /><path d="M5 12h14" /></>),
    minus: <path d="M5 12h14" />,
    x: (<><path d="M18 6 6 18" /><path d="M6 6l12 12" /></>),
    trash: (<><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
    truck: (<><path d="M14 18V6a1 1 0 0 0-1-1H2v13" /><path d="M14 9h5l3 3v6h-8" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    chat: <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 21 11.5z" />,
    card: (<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>),
    lock: (<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
    star: <path d="M12 2l3 6.9 7.6.6-5.8 5 1.8 7.4L12 18l-6.4 3.9 1.8-7.4-5.8-5 7.6-.6z" />,
  };
  return (
    <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {p[name]}
    </svg>
  );
}

export default function PrimeHaul() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState({});
  const [drawer, setDrawer] = useState(false);
  const [bump, setBump] = useState(false);
  const [toast, setToast] = useState(null);

  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cArea, setCArea] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!useLive) { setProducts(SAMPLE); setLoading(false); return; }
      const { data, error } = await sb.from("products").select("*").eq("active", true).order("created_at", { ascending: true });
      if (error) setError(error.message);
      else setProducts(data || []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const filtered = useMemo(() => products.filter((p) => {
    const okCat = cat === "All" || p.category === cat;
    const okQ = p.name.toLowerCase().includes(query.trim().toLowerCase());
    return okCat && okQ;
  }), [products, query, cat]);

  const items = useMemo(() => Object.entries(cart).map(([id, qty]) => ({ ...products.find((p) => p.id === id), qty })).filter((i) => i.id), [cart, products]);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);

  function add(p) {
    const cur = cart[p.id] || 0;
    if (cur >= p.stock) { setToast(`Only ${p.stock} in stock — ${p.name}`); return; }
    setCart((c) => ({ ...c, [p.id]: cur + 1 }));
    setBump(true); setTimeout(() => setBump(false), 380);
    setToast(`Added to your haul — ${p.name}`);
  }
  function setQty(id, qty) {
    const p = products.find((x) => x.id === id);
    const capped = p ? Math.min(qty, p.stock) : qty;
    setCart((c) => { const n = { ...c }; if (capped <= 0) delete n[id]; else n[id] = capped; return n; });
  }
  function clearAfterOrder() {
    setCart({}); setCName(""); setCPhone(""); setCEmail(""); setCArea(""); setDrawer(false);
  }
  const orderItems = () => items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price }));

  async function placeWhatsAppOrder() {
    if (!count) return;
    if (!cName.trim() || !cPhone.trim()) { setToast("Add your name and phone to continue"); return; }
    setBusy(true);
    const ref = genRef();
    if (sb) {
      try {
        await sb.from("orders").insert({
          ref, customer_name: cName.trim(), phone: cPhone.trim(), email: cEmail.trim() || null,
          area: cArea.trim() || null, items: orderItems(), subtotal, channel: "whatsapp", status: "new",
        });
      } catch (e) { /* proceed anyway */ }
    }
    const lines = items.map((i) => `• ${i.qty} × ${i.name} — ${cedis(i.qty * i.price)}`);
    const msg =
      `Hello PrimeHaul 👋\nOrder: ${ref}\n\nName: ${cName.trim()}\nPhone: ${cPhone.trim()}` +
      (cArea.trim() ? `\nArea: ${cArea.trim()}` : "") +
      `\n\nItems:\n` + lines.join("\n") +
      `\n\nSubtotal: ${cedis(subtotal)}\n\n(Please confirm delivery fee & full address.)`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
    setBusy(false);
    clearAfterOrder();
    setToast(`Order ${ref} sent — continue on WhatsApp`);
  }

  async function payWithPaystack() {
    if (!count) return;
    if (!paystackReady) { setToast("Online payment isn't configured yet"); return; }
    if (!cName.trim() || !cPhone.trim() || !cEmail.trim()) { setToast("Add name, phone and email to pay online"); return; }
    if (!window.PaystackPop) { setToast("Payment library didn't load — refresh and retry"); return; }

    setBusy(true);
    const ref = genRef();

    // Record the order as pending first, so we have it even if payment is abandoned.
    if (sb) {
      try {
        await sb.from("orders").insert({
          ref, customer_name: cName.trim(), phone: cPhone.trim(), email: cEmail.trim(),
          area: cArea.trim() || null, items: orderItems(), subtotal, channel: "paystack", status: "pending",
        });
      } catch (e) { /* proceed to payment anyway */ }
    }

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: cEmail.trim(),
      amount: Math.round(subtotal * 100), // pesewas
      currency: "GHS",
      ref,
      metadata: {
        custom_fields: [
          { display_name: "Name", variable_name: "name", value: cName.trim() },
          { display_name: "Phone", variable_name: "phone", value: cPhone.trim() },
          { display_name: "Area", variable_name: "area", value: cArea.trim() || "-" },
        ],
      },
      callback: function (response) {
        // Verify server-side before trusting the payment.
        verifyPayment(response.reference || ref).then((ok) => {
          if (ok) { setToast(`Payment confirmed — order ${ref}`); clearAfterOrder(); }
          else { setToast("Payment received — we'll confirm it shortly"); }
        });
      },
      onClose: function () { setToast("Payment window closed — order saved as pending"); },
    });
    setBusy(false);
    handler.openIframe();
  }

  async function verifyPayment(reference) {
    try {
      const r = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const d = await r.json();
      return d.status === "success";
    } catch { return false; }
  }

  return (
    <div>
      <header className="ph-header">
        <button className="ph-brand" onClick={() => { setCat("All"); setQuery(""); }}>
          <span className="ph-mark"><Icon name="bag" size={18} sw={2.4} /></span>
          <span className="ph-word">Prime<b>Haul</b></span>
        </button>
        <div className="ph-search">
          <span className="ph-search-ic"><Icon name="search" size={17} /></span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the haul…" />
        </div>
        <button className={"ph-cartbtn" + (bump ? " ph-bump" : "")} onClick={() => setDrawer(true)}>
          <Icon name="bag" size={20} />
          {count > 0 && <span className="ph-badge">{count}</span>}
        </button>
      </header>

      <section className="ph-hero">
        <div className="ph-hero-in">
          <p className="ph-eyebrow">Imported · Vetted · Delivered nationwide</p>
          <h1>Quality finds, hauled straight to your door.</h1>
          <div className="ph-trust">
            <span><Icon name="truck" size={15} /> Nationwide delivery</span>
            <span><Icon name="shield" size={15} /> Checked before it ships</span>
            <span><Icon name="chat" size={15} /> Pay online or on WhatsApp</span>
          </div>
        </div>
      </section>

      <nav className="ph-chips">
        {categories.map((c) => (
          <button key={c} className={"ph-chip" + (cat === c ? " ph-chip-on" : "")} onClick={() => setCat(c)}>{c}</button>
        ))}
      </nav>

      <main className="ph-grid">
        {loading && Array.from({ length: 8 }).map((_, i) => <div key={i} className="ph-card ph-skel" />)}
        {!loading && error && <div className="ph-empty-grid"><p>Couldn't load products. {error}</p></div>}
        {!loading && !error && filtered.map((p) => {
          const inCart = cart[p.id] || 0;
          const sold = p.stock <= 0;
          const low = !sold && p.stock <= LOW_STOCK;
          return (
            <article key={p.id} className="ph-card">
              <div className="ph-tile">
                {p.image_url ? <img src={p.image_url} alt="" className="ph-img" /> : <span className="ph-emoji">{p.emoji || "📦"}</span>}
                {p.was_price && <span className="ph-deal">Deal</span>}
                {sold && <span className="ph-soldtag">Sold out</span>}
              </div>
              <div className="ph-cat">{p.category}</div>
              <h3 className="ph-name">{p.name}</h3>
              <div className="ph-priceRow">
                <span className="ph-price">{cedis(p.price)}</span>
                {p.was_price && <span className="ph-was">{cedis(p.was_price)}</span>}
              </div>
              {low && <div className="ph-low">Only {p.stock} left</div>}
              <button className="ph-add" onClick={() => add(p)} disabled={sold}>
                {sold ? "Sold out" : (<><Icon name="plus" size={16} sw={2.6} />{inCart ? `In haul (${inCart})` : "Add to haul"}</>)}
              </button>
            </article>
          );
        })}
        {!loading && !error && filtered.length === 0 && (
          <div className="ph-empty-grid">
            <p>Nothing matches “{query}”.</p>
            <button onClick={() => { setQuery(""); setCat("All"); }}>Clear search</button>
          </div>
        )}
      </main>

      <footer className="ph-footer">
        <div className="ph-word ph-word-sm">Prime<b>Haul</b></div>
        <p>Eikwe, Western Region · Ghana &nbsp;·&nbsp; WhatsApp 059 741 4760</p>
      </footer>

      {drawer && <div className="ph-overlay" onClick={() => setDrawer(false)} />}
      <aside className={"ph-drawer" + (drawer ? " ph-drawer-open" : "")}>
        <div className="ph-drawer-head">
          <h2>Your haul {count > 0 && <span>({count})</span>}</h2>
          <button className="ph-x" onClick={() => setDrawer(false)}><Icon name="x" size={20} /></button>
        </div>
        <div className="ph-drawer-body">
          {items.length === 0 ? (
            <div className="ph-empty">
              <div className="ph-empty-mark"><Icon name="bag" size={26} /></div>
              <p>Your haul is empty.</p>
              <button onClick={() => setDrawer(false)}>Start shopping</button>
            </div>
          ) : items.map((i) => (
            <div key={i.id} className="ph-line">
              <span className="ph-line-emoji">{i.image_url ? <img src={i.image_url} alt="" className="ph-line-img" /> : (i.emoji || "📦")}</span>
              <div className="ph-line-main">
                <div className="ph-line-name">{i.name}</div>
                <div className="ph-line-price">{cedis(i.price)}</div>
              </div>
              <div className="ph-stepper">
                <button onClick={() => setQty(i.id, i.qty - 1)}><Icon name="minus" size={14} /></button>
                <span>{i.qty}</span>
                <button onClick={() => setQty(i.id, i.qty + 1)}><Icon name="plus" size={14} /></button>
              </div>
              <button className="ph-line-del" onClick={() => setQty(i.id, 0)}><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="ph-drawer-foot">
            <div className="ph-subtotal"><span>Subtotal</span><b>{cedis(subtotal)}</b></div>
            <div className="ph-fields">
              <input className="ph-field" placeholder="Your name" value={cName} onChange={(e) => setCName(e.target.value)} />
              <input className="ph-field" placeholder="Phone number" value={cPhone} onChange={(e) => setCPhone(e.target.value)} />
              <input className="ph-field" placeholder="Email (needed for card / mobile money)" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
              <input className="ph-field" placeholder="Town / area (optional)" value={cArea} onChange={(e) => setCArea(e.target.value)} />
            </div>
            <div className="ph-delivery">
              <Icon name="truck" size={15} />
              <span>Prices exclude delivery. Your delivery fee depends on your area and is confirmed on WhatsApp before dispatch.</span>
            </div>
            <button className="ph-pay" onClick={payWithPaystack} disabled={busy}>
              <Icon name="card" size={18} /> {busy ? "Please wait…" : "Pay with Paystack"}
            </button>
            <div className="ph-secure"><Icon name="lock" size={12} /> Secured by Paystack · card &amp; mobile money</div>
            <div className="ph-or">or</div>
            <button className="ph-wa" onClick={placeWhatsAppOrder} disabled={busy}>
              <Icon name="chat" size={18} /> Order on WhatsApp
            </button>
          </div>
        )}
      </aside>

      {toast && <div className="ph-toast"><Icon name="star" size={14} /> {toast}</div>}
    </div>
  );
}
