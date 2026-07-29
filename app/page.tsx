"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { defaultDishes, defaultSettings, Dish, RestaurantSettings } from "../lib/data";
import { dishFromRow, settingsFromRow, supabase } from "../lib/supabase";

type CartItem = Dish & { quantity: number };
const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export default function Home() {
  const [dishes, setDishes] = useState(defaultDishes);
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const [category, setCategory] = useState("Alle");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWebsite() {
      const [settingsResult, dishesResult] = await Promise.all([
        supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("dishes").select("*").order("id"),
      ]);

      if (cancelled) return;
      if (settingsResult.data) {
        setSettings({ ...defaultSettings, ...settingsFromRow(settingsResult.data) });
      }
      if (dishesResult.data && dishesResult.data.length > 0) {
        setDishes(dishesResult.data.map(dishFromRow));
      }
    }

    loadWebsite().catch(() => {
      // Bei einem Netzwerkfehler bleiben die Standarddaten sichtbar.
    });

    return () => { cancelled = true; };
  }, []);

  const activeDishes = dishes.filter((dish) => dish.active !== false);
  const categories = ["Alle", ...Array.from(new Set(activeDishes.map((dish) => dish.category)))];
  const visibleDishes = activeDishes.filter((dish) => {
    const matchesCategory = category === "Alle" || dish.category === category;
    const term = search.trim().toLocaleLowerCase("de-DE");
    const matchesSearch = !term || `${dish.name} ${dish.description} ${dish.category}`.toLocaleLowerCase("de-DE").includes(term);
    return matchesCategory && matchesSearch;
  });
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  }

  function addToCart(dish: Dish) {
    setCart((current) => {
      const existing = current.find((item) => item.id === dish.id);
      return existing ? current.map((item) => item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...dish, quantity: 1 }];
    });
    flash(`${dish.name} wurde hinzugefügt.`);
  }

  function updateQuantity(id: number, change: number) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: item.quantity + change } : item).filter((item) => item.quantity > 0));
  }

  function orderViaWhatsApp() {
    if (!cart.length) return;
    const lines = cart.map((item) => `${item.quantity}× ${item.name} – ${euro.format(item.price * item.quantity)}`);
    const message = `Hallo ${settings.name}, ich möchte bestellen:\n\n${lines.join("\n")}\n\nGesamt: ${euro.format(total)}\n\nName:\nAbholzeit:`;
    window.open(`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = `Reservierungsanfrage für ${settings.name}\nName: ${data.get("name")}\nTelefon: ${data.get("phone")}\nPersonen: ${data.get("guests")}\nDatum: ${data.get("date")}\nUhrzeit: ${data.get("time")}\nHinweis: ${data.get("message") || "–"}`;
    window.open(`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    flash("Reservierungsanfrage wurde für WhatsApp vorbereitet.");
  }

  return <main style={{ "--accent": settings.primaryColor } as CSSProperties}>
    <header className="nav-wrap"><nav className="nav container">
      <a className="brand" href="#home">{settings.logoImage ? <img className="site-logo" src={settings.logoImage} alt={`${settings.name} Logo`} /> : <span className="brand-mark">C</span>}<span><strong>{settings.shortName}</strong><small>Indian Cuisine</small></span></a>
      <div className="nav-links"><a href="#menu">Speisekarte</a><a href="#about">Über uns</a><a href="#reservation">Reservierung</a><a href="#contact">Kontakt</a></div>
      <button className="cart-button" onClick={() => setCartOpen(true)}>Warenkorb <span>{itemCount}</span></button>
    </nav></header>

    <section className={settings.heroImage ? "hero hero-has-image" : "hero"} id="home" style={settings.heroImage ? { backgroundImage: `linear-gradient(90deg, rgba(15,10,6,.92), rgba(15,10,6,.52)), url(${settings.heroImage})` } : undefined}><div className="hero-glow hero-glow-one"/><div className="hero-glow hero-glow-two"/><div className="container hero-grid">
      <div className="hero-copy"><p className="eyebrow">Authentisch · Frisch · Aromatisch</p><h1>{settings.heroTitle || settings.name}</h1><p className="hero-name">{settings.name}</p><p className="hero-text">{settings.slogan}</p><div className="hero-actions"><a className="button primary" href="#menu">Jetzt bestellen</a><a className="button secondary" href="#reservation">Tisch reservieren</a></div><div className="hero-facts"><span>★ Hochwertige Zutaten</span><span>✓ Frisch zubereitet</span><span>✓ Vegetarische Auswahl</span></div></div>
      </div></section>

    <section className="section intro" id="about"><div className="container intro-grid"><div><p className="eyebrow dark">Willkommen bei Costa's Indian </p><h2>Ein Stück Indien im Herzen von Sittensen</h2></div><p>Traditionelle indische Kochkunst trifft auf herzliche Gastfreundschaft. Unsere Gerichte werden frisch zubereitet und auf Wunsch mild, würzig oder original indisch serviert.</p></div></section>

    <section className="section menu-section" id="menu"><div className="container"><div className="section-heading"><div><p className="eyebrow dark">Unsere Auswahl</p><h2>Speisekarte</h2></div><p>Gerichte auswählen, Warenkorb öffnen und die Bestellung direkt per WhatsApp senden.</p></div>
      <div className="menu-tools"><label className="menu-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Gericht suchen …" /></label><span>{visibleDishes.length} Gerichte</span></div>
      <div className="category-row">{categories.map((item) => <button key={item} className={category === item ? "category active" : "category"} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="dish-grid">{visibleDishes.map((dish) => <article className="dish-card" key={dish.id}>{dish.image ? <div className="dish-photo" style={{backgroundImage:`url(${dish.image})`}} /> : <div className="dish-icon">{dish.icon}</div>}<div className="dish-content"><div className="dish-top"><h3>{dish.name}</h3><strong>{euro.format(dish.price)}</strong></div><p>{dish.description}</p><div className="dish-bottom"><span>{dish.vegan ? "Vegan" : dish.vegetarian ? "Vegetarisch" : dish.spicy ? "Scharf" : dish.category}</span><button onClick={() => addToCart(dish)}>Hinzufügen +</button></div></div></article>)}</div>
    </div></section>

    <section className="section feature-section"><div className="container feature-grid">{[["🌿","Frische Zutaten","Täglich frisch verarbeitet."],["🫚","Original Gewürze","Aromen nach traditionellen Rezepten."],["🤝","Herzlicher Service","Gastfreundschaft mit Persönlichkeit."],["🥡","Einfach bestellen","Auswählen und per WhatsApp senden."]].map(([icon,title,text]) => <div className="feature" key={title}><span>{icon}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>

    <section className="section reservation-section" id="reservation"><div className="container reservation-grid"><div><p className="eyebrow">Dein Tisch wartet</p><h2>Reservierung anfragen</h2><p>Die Anfrage wird direkt als WhatsApp-Nachricht vorbereitet.</p><div className="opening"><b>Öffnungszeiten</b><span>{settings.openingHours}</span></div></div>
      <form className="reservation-form" onSubmit={submitReservation}><label>Name<input name="name" required placeholder="Vor- und Nachname" /></label><div className="form-row"><label>Telefon<input name="phone" type="tel" required placeholder="Telefonnummer" /></label><label>Personen<select name="guests" defaultValue="2"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6+</option></select></label></div><div className="form-row"><label>Datum<input name="date" type="date" required /></label><label>Uhrzeit<input name="time" type="time" required /></label></div><label>Hinweis<textarea name="message" placeholder="Allergien oder besondere Wünsche" /></label><button className="button primary full" type="submit">Reservierung per WhatsApp</button></form>
    </div></section>

    <section className="section reviews"><div className="container"><div className="section-heading"><div><p className="eyebrow dark">Gastfreundschaft</p><h2>Mit Liebe serviert</h2></div></div><div className="review-grid">{[["★★★★★","Aromatische Küche und freundlicher Service.","Unsere Gäste"],["★★★★★","Beliebte Klassiker und vegetarische Auswahl.","Costa's"],["★★★★★","Frisch gekocht und unkompliziert bestellbar.","Sittensen"]].map(([stars,text,name]) => <blockquote key={name}><div>{stars}</div><p>„{text}“</p><cite>{name}</cite></blockquote>)}</div></div></section>

    <section className="section" id="contact"><div className="container contact-grid"><div><p className="eyebrow dark">Kontakt</p><h2>Besuche uns in Sittensen</h2><p><b>{settings.name}</b><br/>{settings.street}<br/>{settings.city}<br/><br/>Telefon: {settings.phone}<br/>E-Mail: {settings.email}</p><div className="contact-actions"><a className="button primary" href={`tel:${settings.phone.replace(/\s/g,"")}`}>Jetzt anrufen</a><a className="button outline" target="_blank" rel="noreferrer" href={`https://wa.me/${settings.whatsapp}`}>WhatsApp</a></div></div><div className="map-card"><span>📍</span><b>{settings.street}</b><small>{settings.city}</small><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.street}, ${settings.city}`)}`}>Route in Google Maps öffnen</a></div></div></section>

    <footer><div className="container"><div className="footer-grid"><div className="brand">{settings.logoImage ? <img className="site-logo" src={settings.logoImage} alt=""/> : <span className="brand-mark">C</span>}<span><strong>{settings.shortName}</strong><small>Indian Cuisine</small></span></div><div><b>Kontakt</b><a href={`tel:${settings.phone.replace(/\s/g,"")}`}>{settings.phone}</a><a href={`mailto:${settings.email}`}>{settings.email}</a></div><div><b>Navigation</b><a href="#menu">Speisekarte</a><a href="#reservation">Reservierung</a></div><div><b>Verwaltung</b><a href="/admin">Admin-Bereich</a></div></div><div className="copyright">© {new Date().getFullYear()} {settings.name}. Alle Rechte vorbehalten.</div></div></footer>

    {cartOpen && <div className="cart-overlay" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}><aside className="cart-panel"><div className="cart-header"><div><small>Deine Auswahl</small><h2>Warenkorb</h2></div><button onClick={() => setCartOpen(false)}>×</button></div>{!cart.length ? <div className="empty-cart"><span>🛒</span><p>Dein Warenkorb ist leer.</p></div> : <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><div><b>{item.name}</b><small>{euro.format(item.price * item.quantity)}</small></div><div className="quantity"><button onClick={() => updateQuantity(item.id,-1)}>−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id,1)}>+</button></div></div>)}</div><div className="cart-total"><span>Gesamt</span><b>{euro.format(total)}</b></div><button className="button primary full" onClick={orderViaWhatsApp}>Per WhatsApp bestellen</button><p className="cart-note">Die Bestellung wird in WhatsApp geöffnet und erst nach dem Absenden übermittelt.</p></>}</aside></div>}
    {notice && <div className="toast">{notice}</div>}
  </main>;
}
