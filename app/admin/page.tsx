"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { defaultDishes, defaultSettings, Dish, RestaurantSettings } from "../lib/data";
import { dishFromRow, settingsFromRow, supabase } from "../lib/supabase";

type CartItem = Dish & { quantity: number };
type OrderType = "pickup" | "delivery";

type DeliveryZone = {
  id: string;
  label: string;
  minimumOrder: number;
  deliveryFee: number;
};

const deliveryZones: DeliveryZone[] = [
  { id: "zone-1", label: "1–3 km", minimumOrder: 20, deliveryFee: 2 },
  { id: "zone-2", label: "über 3–6 km", minimumOrder: 30, deliveryFee: 2 },
  { id: "zone-3", label: "über 6–10 km", minimumOrder: 40, deliveryFee: 3 },
  { id: "zone-4", label: "über 10–14 km", minimumOrder: 50, deliveryFee: 4 },
];

function getToday() {
  return new Date().toISOString().split("T")[0];
}
const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export default function Home() {
  const [dishes, setDishes] = useState(defaultDishes);
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const [category, setCategory] = useState("Alle");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("pickup");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [websiteLoading, setWebsiteLoading] = useState(true);

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

    loadWebsite()
      .catch(() => {
        // Bei einem Netzwerkfehler bleiben die Standarddaten sichtbar.
      })
      .finally(() => {
        if (!cancelled) setWebsiteLoading(false);
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
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const selectedDeliveryZone = deliveryZones.find((zone) => zone.id === deliveryZoneId) ?? null;
  const deliveryFee = orderType === "delivery" && selectedDeliveryZone ? selectedDeliveryZone.deliveryFee : 0;
  const finalTotal = subtotal + deliveryFee;
  const bestsellers = useMemo(() => activeDishes.slice(0, 4), [activeDishes]);
  const galleryImages = useMemo(
    () => activeDishes.filter((dish) => Boolean(dish.image)).slice(0, 6),
    [activeDishes]
  );

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

  function openOrderForm() {
    if (!cart.length) return;
    setOrderOpen(true);
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cart.length) {
      flash("Dein Warenkorb ist leer.");
      return;
    }

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const date = String(data.get("date") || "").trim();
    const time = String(data.get("time") || "").trim();
    const note = String(data.get("note") || "").trim();

    if (!name || !phone || !date || !time) {
      flash("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }

    if (time < "17:00" || time > "22:00") {
      flash("Bitte eine Zeit zwischen 17:00 und 22:00 Uhr wählen.");
      return;
    }

    if (orderType === "delivery" && !selectedDeliveryZone) {
      flash("Bitte eine Lieferzone auswählen.");
      return;
    }

    if (
      orderType === "delivery" &&
      selectedDeliveryZone &&
      subtotal < selectedDeliveryZone.minimumOrder
    ) {
      flash(`Der Mindestbestellwert für ${selectedDeliveryZone.label} beträgt ${euro.format(selectedDeliveryZone.minimumOrder)}.`);
      return;
    }

    const street = String(data.get("street") || "").trim();
    const postalCode = String(data.get("postalCode") || "").trim();
    const city = String(data.get("city") || "").trim();

    if (orderType === "delivery" && (!street || !postalCode || !city)) {
      flash("Bitte die vollständige Lieferadresse eingeben.");
      return;
    }

    const lines = cart.map(
      (item) => `${item.quantity}× ${item.name} – ${euro.format(item.price * item.quantity)}`
    );

    const details =
      orderType === "pickup"
        ? ["🥡 Bestellart: Abholung"]
        : [
            "🚚 Bestellart: Lieferung",
            `📍 Lieferzone: ${selectedDeliveryZone?.label}`,
            `🏠 Straße & Hausnummer: ${street}`,
            `📮 PLZ: ${postalCode}`,
            `🏙️ Ort: ${city}`,
            `🔔 Klingelname: ${String(data.get("doorbell") || "").trim() || "–"}`,
          ];

    const prices =
      orderType === "delivery"
        ? [
            `Zwischensumme: ${euro.format(subtotal)}`,
            `Liefergebühr: ${euro.format(deliveryFee)}`,
            `Gesamt: ${euro.format(finalTotal)}`,
          ]
        : [`Gesamt: ${euro.format(subtotal)}`];

    const message = [
      `🍛 Neue Bestellung – ${settings.name}`,
      "",
      `👤 Name: ${name}`,
      `📞 Telefon: ${phone}`,
      `📅 Datum: ${date}`,
      `🕔 Uhrzeit: ${time} Uhr`,
      "",
      ...details,
      "",
      "🍽️ Bestellung:",
      ...lines,
      "",
      ...prices,
      "",
      `📝 Bemerkung: ${note || "–"}`,
      "",
      "Vielen Dank!",
    ].join("\n");

    window.open(
      `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );

    setCart([]);
    setOrderOpen(false);
    setCartOpen(false);
    setDeliveryZoneId("");
    setOrderType("pickup");
    flash("Die Bestellung wurde für WhatsApp vorbereitet.");
  }

  function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const reservationTime = String(data.get("time") || "");

    if (reservationTime < "17:00" || reservationTime > "22:00") {
      flash("Reservierungen sind zwischen 17:00 und 22:00 Uhr möglich.");
      return;
    }

    const message = `Reservierungsanfrage für ${settings.name}\nName: ${data.get("name")}\nTelefon: ${data.get("phone")}\nPersonen: ${data.get("guests")}\nDatum: ${data.get("date")}\nUhrzeit: ${data.get("time")}\nHinweis: ${data.get("message") || "–"}`;
    window.open(`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    flash("Reservierungsanfrage wurde für WhatsApp vorbereitet.");
  }

  if (websiteLoading) {
    return (
      <main className="premium-loading-screen" aria-live="polite">
        <div className="premium-loading-logo">C</div>
        <h1>Costa&apos;s Indian Cuisine</h1>
        <p>Die Website wird vorbereitet …</p>
        <span className="premium-loading-spinner" />
      </main>
    );
  }

  return <main style={{ "--accent": settings.primaryColor } as CSSProperties}>
    <header className="premium-header">
      <nav className="premium-nav container">
        <a className="premium-brand" href="#home" onClick={() => setMobileMenuOpen(false)}>
          {settings.logoImage ? (
            <img className="premium-logo" src={settings.logoImage} alt={`${settings.name} Logo`} />
          ) : (
            <span className="premium-logo-fallback">C</span>
          )}
          <span className="premium-brand-text">
            <strong>{settings.shortName}</strong>
            <small>Indian Cuisine</small>
          </span>
        </a>

        <div className="premium-links">
          <a href="#menu">Speisekarte</a>
          <a href="#about">Über uns</a>
          <a href="#reservation">Reservierung</a>
          <a href="#contact">Kontakt</a>
        </div>

        <div className="premium-header-actions">
          <a
            className="premium-action whatsapp"
            target="_blank"
            rel="noreferrer"
            href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
          >
            WhatsApp
          </a>
          <a
            className="premium-action phone"
            href={`tel:${settings.phone.replace(/\s/g, "")}`}
          >
            Anrufen
          </a>
          <button className="premium-cart" onClick={() => setCartOpen(true)} aria-label="Warenkorb öffnen">
            <span aria-hidden="true">🛒</span>
            <b>{itemCount}</b>
          </button>
          <button
            className="premium-menu-toggle"
            type="button"
            aria-label="Navigation öffnen"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="premium-mobile-menu">
          <a href="#menu" onClick={() => setMobileMenuOpen(false)}>Speisekarte</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>Über uns</a>
          <a href="#reservation" onClick={() => setMobileMenuOpen(false)}>Reservierung</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Kontakt</a>
          <div className="premium-mobile-actions">
            <a
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
            >
              💬 WhatsApp
            </a>
            <a href={`tel:${settings.phone.replace(/\s/g, "")}`}>📞 Jetzt anrufen</a>
          </div>
        </div>
      )}
    </header>

    <section
      className="premium-hero"
      id="home"
      style={
        settings.heroImage
          ? {
              backgroundImage: `linear-gradient(90deg, rgba(7,5,3,.96), rgba(7,5,3,.72), rgba(7,5,3,.35)), url(${settings.heroImage})`,
            }
          : undefined
      }
    >
      <div className="premium-hero-overlay" />
      <div className="premium-spice-glow premium-spice-glow-one" />
      <div className="premium-spice-glow premium-spice-glow-two" />

      <div className="container premium-hero-inner">
        <div className="premium-hero-copy">
          <p className="premium-kicker">Authentisch · Frisch · Aromatisch</p>
          <h1>{settings.heroTitle || settings.name}</h1>
          <p className="premium-hero-name">{settings.name}</p>
          <p className="premium-hero-text">{settings.slogan}</p>

          <div className="premium-hero-buttons">
            <a className="premium-primary-button" href="#menu">🍛 Jetzt bestellen</a>
            <a className="premium-secondary-button" href="#reservation">📅 Tisch reservieren</a>
          </div>

          <div className="premium-trust-row">
            <span>★ Hochwertige Zutaten</span>
            <span>✓ Frisch zubereitet</span>
            <span>✓ Lieferung & Abholung</span>
          </div>
        </div>
      </div>
    </section>

    {bestsellers.length > 0 && (
      <section className="section premium-bestsellers" aria-labelledby="bestseller-title">
        <div className="container">
          <div className="section-heading premium-heading">
            <div>
              <p className="eyebrow dark">Besonders beliebt</p>
              <h2 id="bestseller-title">Unsere Bestseller</h2>
            </div>
            <p>Vier Lieblingsgerichte unserer Gäste – frisch gekocht und direkt bestellbar.</p>
          </div>

          <div className="premium-bestseller-grid">
            {bestsellers.map((dish, index) => (
              <article className="premium-bestseller-card" key={`bestseller-${dish.id}`}>
                <div
                  className="premium-bestseller-image"
                  style={dish.image ? { backgroundImage: `url(${dish.image})` } : undefined}
                >
                  {!dish.image && <span>{dish.icon || "🍛"}</span>}
                  <b>#{index + 1}</b>
                </div>
                <div className="premium-bestseller-content">
                  <small>{dish.category}</small>
                  <h3>{dish.name}</h3>
                  <p>{dish.description}</p>
                  <div>
                    <strong>{euro.format(dish.price)}</strong>
                    <button type="button" onClick={() => addToCart(dish)}>
                      In den Warenkorb
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    )}

    <section className="section intro" id="about"><div className="container intro-grid"><div><p className="eyebrow dark">Willkommen bei Costa's Indian Cuisine </p><h2>Ein Stück Indien im Herzen von Sittensen</h2></div><p>Traditionelle indische Kochkunst trifft auf herzliche Gastfreundschaft. Unsere Gerichte werden frisch zubereitet und auf Wunsch mild, würzig oder original indisch serviert.</p></div></section>

    <section className="section menu-section" id="menu"><div className="container"><div className="section-heading"><div><p className="eyebrow dark">Unsere Auswahl</p><h2>Speisekarte</h2></div><p>Gerichte auswählen, Warenkorb öffnen und die Bestellung direkt per WhatsApp senden.</p></div>
      <div className="menu-tools"><label className="menu-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Gericht suchen …" /></label><span>{visibleDishes.length} Gerichte</span></div>
      <div className="category-row">{categories.map((item) => <button key={item} className={category === item ? "category active" : "category"} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="dish-grid">{visibleDishes.map((dish) => <article className="dish-card" key={dish.id}>{dish.image ? <div className="dish-photo" style={{backgroundImage:`url(${dish.image})`}} /> : <div className="dish-icon">{dish.icon}</div>}<div className="dish-content"><div className="dish-top"><h3>{dish.name}</h3><strong>{euro.format(dish.price)}</strong></div><p>{dish.description}</p><div className="dish-bottom"><span>{dish.vegan ? "Vegan" : dish.vegetarian ? "Vegetarisch" : dish.spicy ? "Scharf" : dish.category}</span><button onClick={() => addToCart(dish)}>Hinzufügen +</button></div></div></article>)}</div>
    </div></section>

    <section className="section feature-section"><div className="container feature-grid">{[["🌿","Frische Zutaten","Täglich frisch verarbeitet."],["🫚","Original Gewürze","Aromen nach traditionellen Rezepten."],["🤝","Herzlicher Service","Gastfreundschaft mit Persönlichkeit."],["🥡","Einfach bestellen","Auswählen und per WhatsApp senden."]].map(([icon,title,text]) => <div className="feature" key={title}><span>{icon}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>

    <section className="section reservation-section" id="reservation"><div className="container reservation-grid"><div><p className="eyebrow">Dein Tisch wartet</p><h2>Reservierung anfragen</h2><p>Die Anfrage wird direkt als WhatsApp-Nachricht vorbereitet.</p><div className="opening"><b>Öffnungszeiten</b><span>{settings.openingHours}</span></div></div>
      <form className="reservation-form" onSubmit={submitReservation}><label>Name<input name="name" required placeholder="Vor- und Nachname" /></label><div className="form-row"><label>Telefon<input name="phone" type="tel" required placeholder="Telefonnummer" /></label><label>Personen<select name="guests" defaultValue="2"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6+</option></select></label></div><div className="form-row"><label>Datum<input name="date" type="date" min={getToday()} required /></label><label>Uhrzeit<input name="time" type="time" min="17:00" max="22:00" step="300" required /></label></div><label>Hinweis<textarea name="message" placeholder="Allergien oder besondere Wünsche" /></label><button className="button primary full" type="submit">Reservierung per WhatsApp</button></form>
    </div></section>

    <section className="section reviews"><div className="container"><div className="section-heading"><div><p className="eyebrow dark">Gastfreundschaft</p><h2>Mit Liebe serviert</h2></div></div><div className="review-grid">{[["★★★★★","Aromatische Küche und freundlicher Service.","Unsere Gäste"],["★★★★★","Beliebte Klassiker und vegetarische Auswahl.","Costa's"],["★★★★★","Frisch gekocht und unkompliziert bestellbar.","Sittensen"]].map(([stars,text,name]) => <blockquote key={name}><div>{stars}</div><p>„{text}“</p><cite>{name}</cite></blockquote>)}</div></div></section>

    {galleryImages.length > 0 && (
      <section className="section premium-gallery-section" id="gallery">
        <div className="container">
          <div className="section-heading premium-heading">
            <div>
              <p className="eyebrow dark">Ein Blick in unsere Küche</p>
              <h2>Galerie</h2>
            </div>
            <p>Authentische Gerichte, frische Zutaten und liebevolle Präsentation.</p>
          </div>

          <div className="premium-gallery-grid">
            {galleryImages.map((dish, index) => (
              <figure
                className={`premium-gallery-item premium-gallery-item-${index + 1}`}
                key={`gallery-${dish.id}`}
              >
                <img src={dish.image} alt={`${dish.name} bei ${settings.name}`} loading="lazy" />
                <figcaption>
                  <strong>{dish.name}</strong>
                  <span>{dish.category}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    )}

    <section className="section premium-faq-section" id="faq">
      <div className="container premium-faq-grid">
        <div>
          <p className="eyebrow dark">Gut zu wissen</p>
          <h2>Häufige Fragen</h2>
          <p>
            Hier findest du die wichtigsten Informationen zu Bestellung,
            Lieferung, Abholung und Reservierung.
          </p>
        </div>

        <div className="premium-faq-list">
          <details>
            <summary>Wie kann ich bestellen?</summary>
            <p>
              Wähle deine Gerichte aus, öffne den Warenkorb und sende die fertige
              Bestellung anschließend direkt über WhatsApp.
            </p>
          </details>
          <details>
            <summary>Ist eine Lieferung möglich?</summary>
            <p>
              Ja. Die Liefergebühr und der Mindestbestellwert richten sich nach
              der ausgewählten Entfernung bis maximal 14 Kilometer.
            </p>
          </details>
          <details>
            <summary>Kann ich mein Essen abholen?</summary>
            <p>
              Ja. Wähle beim Bestellen einfach „Abholung“ und gib deine gewünschte
              Abholzeit zwischen 17:00 und 22:00 Uhr an.
            </p>
          </details>
          <details>
            <summary>Wie reserviere ich einen Tisch?</summary>
            <p>
              Fülle das Reservierungsformular aus. Deine Anfrage wird als
              vorbereitete WhatsApp-Nachricht geöffnet.
            </p>
          </details>
          <details>
            <summary>Gibt es vegetarische und vegane Gerichte?</summary>
            <p>
              Ja. Entsprechende Gerichte sind in der Speisekarte gekennzeichnet
              und können über die Suche schnell gefunden werden.
            </p>
          </details>
        </div>
      </div>
    </section>

    <section className="section" id="contact"><div className="container contact-grid"><div><p className="eyebrow dark">Kontakt</p><h2>Besuche uns in Sittensen</h2><p><b>{settings.name}</b><br/>{settings.street}<br/>{settings.city}<br/><br/>Telefon: {settings.phone}<br/>E-Mail: {settings.email}</p><div className="contact-actions"><a className="button primary" href={`tel:${settings.phone.replace(/\s/g,"")}`}>Jetzt anrufen</a><a className="button outline" target="_blank" rel="noreferrer" href={`https://wa.me/${settings.whatsapp}`}>WhatsApp</a></div></div><div className="premium-map-wrap">
        <iframe
          title={`Standort von ${settings.name}`}
          src={`https://www.google.com/maps?q=${encodeURIComponent(`${settings.street}, ${settings.city}`)}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="premium-map-info">
          <span>📍</span>
          <div>
            <b>{settings.street}</b>
            <small>{settings.city}</small>
          </div>
          <a
            target="_blank"
            rel="noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.street}, ${settings.city}`)}`}
          >
            Route öffnen
          </a>
        </div>
      </div></div></section>

    <footer><div className="container"><div className="footer-grid"><div className="brand">{settings.logoImage ? <img className="site-logo" src={settings.logoImage} alt=""/> : <span className="brand-mark">C</span>}<span><strong>{settings.shortName}</strong><small>Indian Cuisine</small></span></div><div><b>Kontakt</b><a href={`tel:${settings.phone.replace(/\s/g,"")}`}>{settings.phone}</a><a href={`mailto:${settings.email}`}>{settings.email}</a></div><div><b>Navigation</b><a href="#menu">Speisekarte</a><a href="#gallery">Galerie</a><a href="#reservation">Reservierung</a><a href="#faq">FAQ</a></div><div><b>Verwaltung</b><a href="/admin">Admin-Bereich</a></div></div><div className="copyright">© {new Date().getFullYear()} {settings.name}. Alle Rechte vorbehalten.</div></div></footer>

    {cartOpen && <div className="cart-overlay" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}><aside className="cart-panel"><div className="cart-header"><div><small>Deine Auswahl</small><h2>Warenkorb</h2></div><button onClick={() => setCartOpen(false)}>×</button></div>{!cart.length ? <div className="empty-cart"><span>🛒</span><p>Dein Warenkorb ist leer.</p></div> : <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><div><b>{item.name}</b><small>{euro.format(item.price * item.quantity)}</small></div><div className="quantity"><button onClick={() => updateQuantity(item.id,-1)}>−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id,1)}>+</button></div></div>)}</div><div className="cart-total"><span>Gesamt</span><b>{euro.format(subtotal)}</b></div><button className="button primary full" onClick={openOrderForm}>Bestellung fortsetzen</button><p className="cart-note">Im nächsten Schritt wählst du Abholung oder Lieferung.</p></>}</aside></div>}

    {orderOpen && <div className="cart-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOrderOpen(false)}>
      <aside className="cart-panel">
        <div className="cart-header"><div><small>Bestellung abschließen</small><h2>Deine Angaben</h2></div><button onClick={() => setOrderOpen(false)}>×</button></div>
        <form className="reservation-form" onSubmit={submitOrder}>
          <div className="form-row">
            <label>Bestellart<select value={orderType} onChange={(e) => { setOrderType(e.target.value as OrderType); setDeliveryZoneId(""); }}><option value="pickup">Abholung</option><option value="delivery">Lieferung</option></select></label>
            {orderType === "delivery" && <label>Lieferzone<select value={deliveryZoneId} onChange={(e) => setDeliveryZoneId(e.target.value)} required><option value="">Bitte auswählen</option>{deliveryZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.label} · Mindestbestellwert {euro.format(zone.minimumOrder)} · Gebühr {euro.format(zone.deliveryFee)}</option>)}</select></label>}
          </div>

          <label>Name<input name="name" required placeholder="Vor- und Nachname" /></label>
          <label>Telefonnummer<input name="phone" type="tel" required placeholder="Telefonnummer" /></label>

          <div className="form-row">
            <label>Datum<input name="date" type="date" min={getToday()} required /></label>
            <label>{orderType === "pickup" ? "Abholzeit" : "Lieferzeit"}<input name="time" type="time" min="17:00" max="22:00" step="300" required /></label>
          </div>

          {orderType === "delivery" && <>
            <label>Straße und Hausnummer<input name="street" required placeholder="Musterstraße 12" /></label>
            <div className="form-row"><label>Postleitzahl<input name="postalCode" inputMode="numeric" required placeholder="27419" /></label><label>Ort<input name="city" required placeholder="Sittensen" /></label></div>
            <label>Klingelname<input name="doorbell" placeholder="Optional" /></label>
          </>}

          <label>Bemerkung<textarea name="note" placeholder="Zum Beispiel: ohne Chili oder bitte anrufen" /></label>

          {orderType === "delivery" && selectedDeliveryZone && <>
            <div className="cart-total"><span>Liefergebühr {euro.format(selectedDeliveryZone.deliveryFee)}</span><b>{euro.format(finalTotal)}</b></div>
            {subtotal < selectedDeliveryZone.minimumOrder && <p className="cart-note">Es fehlen noch <b>{euro.format(selectedDeliveryZone.minimumOrder - subtotal)}</b> bis zum Mindestbestellwert.</p>}
          </>}

          {orderType === "pickup" && <div className="cart-total"><span>Gesamt</span><b>{euro.format(subtotal)}</b></div>}

          <button className="button primary full" type="submit">Per WhatsApp bestellen</button>
          <p className="cart-note">Die Bestellung wird in WhatsApp geöffnet und erst nach dem Absenden übermittelt.</p>
        </form>
      </aside>
    </div>}

    <div className="premium-mobile-bar" aria-label="Schnellaktionen">
      <a
        target="_blank"
        rel="noreferrer"
        href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
      >
        <span>💬</span>
        WhatsApp
      </a>
      <a href={`tel:${settings.phone.replace(/\s/g, "")}`}>
        <span>📞</span>
        Anrufen
      </a>
      <a
        target="_blank"
        rel="noreferrer"
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.street}, ${settings.city}`)}`}
      >
        <span>📍</span>
        Route
      </a>
    </div>

    <style jsx global>{`
      html {
        scroll-behavior: smooth;
      }

      body {
        padding-bottom: 0;
      }

      .premium-header {
        position: sticky;
        top: 0;
        z-index: 1000;
        background: rgba(8, 6, 4, 0.88);
        border-bottom: 1px solid rgba(212, 175, 55, 0.22);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .premium-nav {
        min-height: 82px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .premium-brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        color: #fff;
        text-decoration: none;
        min-width: 0;
      }

      .premium-logo,
      .premium-logo-fallback {
        width: 54px;
        height: 54px;
        flex: 0 0 54px;
        border-radius: 50%;
        border: 2px solid #d4af37;
        box-shadow: 0 0 0 5px rgba(212, 175, 55, 0.08);
      }

      .premium-logo {
        object-fit: cover;
      }

      .premium-logo-fallback {
        display: grid;
        place-items: center;
        background: linear-gradient(145deg, #f7d96b, #b98a16);
        color: #161006;
        font-size: 24px;
        font-weight: 900;
      }

      .premium-brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.1;
      }

      .premium-brand-text strong {
        font-size: 20px;
        letter-spacing: 0.02em;
      }

      .premium-brand-text small {
        margin-top: 5px;
        color: #d9b84b;
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .premium-links {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 30px;
      }

      .premium-links a {
        color: rgba(255,255,255,.9);
        text-decoration: none;
        font-size: 14px;
        font-weight: 700;
        transition: color .2s ease, transform .2s ease;
      }

      .premium-links a:hover {
        color: #f1cc54;
        transform: translateY(-1px);
      }

      .premium-header-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 9px;
      }

      .premium-action,
      .premium-cart,
      .premium-menu-toggle {
        min-height: 43px;
        border-radius: 999px;
        font-weight: 800;
        text-decoration: none;
        border: 1px solid transparent;
        transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
      }

      .premium-action {
        padding: 0 17px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
      }

      .premium-action:hover,
      .premium-cart:hover {
        transform: translateY(-2px);
      }

      .premium-action.whatsapp {
        background: #1f9d55;
        color: white;
        box-shadow: 0 8px 20px rgba(31,157,85,.22);
      }

      .premium-action.phone {
        background: linear-gradient(135deg, #f5d767, #c9961c);
        color: #171006;
        box-shadow: 0 8px 22px rgba(212,175,55,.22);
      }

      .premium-cart {
        position: relative;
        width: 47px;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: #fff;
        background: rgba(255,255,255,.08);
        border-color: rgba(255,255,255,.13);
      }

      .premium-cart b {
        position: absolute;
        top: -7px;
        right: -7px;
        min-width: 22px;
        height: 22px;
        padding: 0 5px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: #d4af37;
        color: #120d05;
        border: 2px solid #090704;
        font-size: 11px;
      }

      .premium-menu-toggle {
        display: none;
        width: 45px;
        padding: 0;
        cursor: pointer;
        color: #f6d65f;
        background: rgba(212,175,55,.09);
        border-color: rgba(212,175,55,.25);
        font-size: 22px;
      }

      .premium-mobile-menu {
        display: none;
      }

      .premium-hero {
        position: relative;
        isolation: isolate;
        min-height: 690px;
        display: flex;
        align-items: center;
        overflow: hidden;
        background-color: #0a0704;
        background-position: center;
        background-size: cover;
      }

      .premium-hero-overlay {
        position: absolute;
        inset: 0;
        z-index: -2;
        background:
          linear-gradient(180deg, rgba(5,3,2,.12), rgba(5,3,2,.38)),
          radial-gradient(circle at 76% 45%, rgba(212,175,55,.08), transparent 34%);
      }

      .premium-spice-glow {
        position: absolute;
        z-index: -1;
        width: 430px;
        height: 430px;
        border-radius: 50%;
        filter: blur(85px);
        opacity: .18;
        pointer-events: none;
      }

      .premium-spice-glow-one {
        left: -180px;
        bottom: -210px;
        background: #d4af37;
      }

      .premium-spice-glow-two {
        right: -200px;
        top: -180px;
        background: #a43d14;
      }

      .premium-hero-inner {
        width: 100%;
        padding-top: 88px;
        padding-bottom: 96px;
      }

      .premium-hero-copy {
        max-width: 790px;
        animation: premiumReveal .7s ease both;
      }

      .premium-kicker {
        margin: 0 0 18px;
        color: #edcb58;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: .2em;
        text-transform: uppercase;
      }

      .premium-hero h1 {
        max-width: 850px;
        margin: 0;
        color: #f3cf58;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(46px, 7vw, 92px);
        line-height: .98;
        letter-spacing: -.045em;
        text-shadow: 0 12px 40px rgba(0,0,0,.42);
      }

      .premium-hero-name {
        margin: 22px 0 0;
        color: #fff;
        font-size: clamp(19px, 2.4vw, 30px);
        font-weight: 800;
      }

      .premium-hero-text {
        max-width: 650px;
        margin: 16px 0 0;
        color: rgba(255,255,255,.82);
        font-size: clamp(17px, 2vw, 21px);
        line-height: 1.65;
      }

      .premium-hero-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 13px;
        margin-top: 34px;
      }

      .premium-primary-button,
      .premium-secondary-button {
        min-height: 54px;
        padding: 0 23px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 900;
        transition: transform .2s ease, box-shadow .2s ease;
      }

      .premium-primary-button {
        color: #160f05;
        background: linear-gradient(135deg, #f7dd78, #c8951d);
        box-shadow: 0 18px 40px rgba(212,175,55,.24);
      }

      .premium-secondary-button {
        color: #fff;
        background: rgba(255,255,255,.08);
        border: 1px solid rgba(255,255,255,.25);
        backdrop-filter: blur(10px);
      }

      .premium-primary-button:hover,
      .premium-secondary-button:hover {
        transform: translateY(-3px);
      }

      .premium-trust-row {
        margin-top: 31px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px 22px;
        color: rgba(255,255,255,.78);
        font-size: 14px;
        font-weight: 700;
      }

      .premium-trust-row span:first-child {
        color: #f0cf5d;
      }

      .premium-mobile-bar {
        display: none;
      }

      @keyframes premiumReveal {
        from {
          opacity: 0;
          transform: translateY(18px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }


      .premium-loading-screen {
        min-height: 100vh;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 14px;
        padding: 30px;
        text-align: center;
        color: #fff;
        background:
          radial-gradient(circle at 50% 35%, rgba(212,175,55,.2), transparent 28%),
          #080604;
      }

      .premium-loading-logo {
        width: 82px;
        height: 82px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: #171006;
        background: linear-gradient(145deg, #f7d96b, #b98a16);
        border: 3px solid #f2d36a;
        box-shadow: 0 0 0 8px rgba(212,175,55,.09);
        font-family: Georgia, serif;
        font-size: 38px;
        font-weight: 900;
      }

      .premium-loading-screen h1 {
        margin: 8px 0 0;
        color: #f0cf5d;
        font-family: Georgia, serif;
        font-size: clamp(28px, 5vw, 46px);
      }

      .premium-loading-screen p {
        margin: 0;
        color: rgba(255,255,255,.72);
      }

      .premium-loading-spinner {
        width: 38px;
        height: 38px;
        margin-top: 8px;
        border: 3px solid rgba(255,255,255,.16);
        border-top-color: #d4af37;
        border-radius: 50%;
        animation: premiumSpin .8s linear infinite;
      }

      @keyframes premiumSpin {
        to { transform: rotate(360deg); }
      }

      .premium-bestsellers {
        overflow: hidden;
        background:
          radial-gradient(circle at 12% 15%, rgba(212,175,55,.1), transparent 25%),
          #f8f3ea;
      }

      .premium-heading h2 {
        font-family: Georgia, "Times New Roman", serif;
      }

      .premium-bestseller-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 20px;
      }

      .premium-bestseller-card {
        overflow: hidden;
        border: 1px solid rgba(91,69,25,.12);
        border-radius: 24px;
        background: #fff;
        box-shadow: 0 20px 55px rgba(64,43,11,.09);
        transition: transform .25s ease, box-shadow .25s ease;
      }

      .premium-bestseller-card:hover {
        transform: translateY(-7px);
        box-shadow: 0 28px 65px rgba(64,43,11,.15);
      }

      .premium-bestseller-image {
        position: relative;
        min-height: 220px;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle, rgba(212,175,55,.22), transparent 55%),
          #171006;
        background-position: center;
        background-size: cover;
      }

      .premium-bestseller-image > span {
        font-size: 72px;
      }

      .premium-bestseller-image > b {
        position: absolute;
        top: 14px;
        left: 14px;
        min-width: 42px;
        height: 42px;
        padding: 0 10px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        color: #171006;
        background: linear-gradient(145deg, #f6dc77, #c8951d);
        box-shadow: 0 8px 24px rgba(0,0,0,.23);
      }

      .premium-bestseller-content {
        padding: 20px;
      }

      .premium-bestseller-content small {
        color: #9b7212;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .premium-bestseller-content h3 {
        margin: 8px 0;
        font-size: 21px;
      }

      .premium-bestseller-content p {
        min-height: 62px;
        margin: 0;
        color: #6f665c;
        line-height: 1.55;
      }

      .premium-bestseller-content > div {
        margin-top: 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .premium-bestseller-content strong {
        font-size: 20px;
      }

      .premium-bestseller-content button {
        min-height: 42px;
        padding: 0 15px;
        border: 0;
        border-radius: 999px;
        cursor: pointer;
        color: #181006;
        background: linear-gradient(135deg, #f4d76c, #c99720);
        font-weight: 900;
      }

      .premium-gallery-section {
        background: #0b0805;
        color: #fff;
      }

      .premium-gallery-section .eyebrow,
      .premium-gallery-section .section-heading p {
        color: #dfbd4d;
      }

      .premium-gallery-section h2 {
        color: #fff;
      }

      .premium-gallery-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        grid-auto-rows: 190px;
        gap: 14px;
      }

      .premium-gallery-item {
        position: relative;
        grid-column: span 4;
        margin: 0;
        overflow: hidden;
        border-radius: 20px;
        background: #17120d;
      }

      .premium-gallery-item-1,
      .premium-gallery-item-6 {
        grid-column: span 6;
        grid-row: span 2;
      }

      .premium-gallery-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform .55s ease;
      }

      .premium-gallery-item:hover img {
        transform: scale(1.06);
      }

      .premium-gallery-item figcaption {
        position: absolute;
        inset: auto 0 0;
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 10px;
        padding: 38px 16px 15px;
        color: #fff;
        background: linear-gradient(transparent, rgba(0,0,0,.82));
      }

      .premium-gallery-item figcaption span {
        color: #e8c85a;
        font-size: 12px;
      }

      .premium-faq-section {
        background: #f8f4ed;
      }

      .premium-faq-grid {
        display: grid;
        grid-template-columns: minmax(0, .7fr) minmax(0, 1.3fr);
        gap: 70px;
        align-items: start;
      }

      .premium-faq-grid h2 {
        margin-bottom: 18px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(36px, 5vw, 58px);
      }

      .premium-faq-grid > div:first-child > p:last-child {
        color: #6d645a;
        line-height: 1.7;
      }

      .premium-faq-list {
        display: grid;
        gap: 12px;
      }

      .premium-faq-list details {
        border: 1px solid #e2d8c9;
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 10px 28px rgba(71,49,15,.05);
      }

      .premium-faq-list summary {
        position: relative;
        padding: 19px 50px 19px 20px;
        cursor: pointer;
        list-style: none;
        font-weight: 900;
      }

      .premium-faq-list summary::-webkit-details-marker {
        display: none;
      }

      .premium-faq-list summary::after {
        content: "+";
        position: absolute;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        color: #b88613;
        font-size: 24px;
      }

      .premium-faq-list details[open] summary::after {
        content: "−";
      }

      .premium-faq-list details p {
        margin: 0;
        padding: 0 20px 20px;
        color: #6c6359;
        line-height: 1.65;
      }

      .premium-map-wrap {
        overflow: hidden;
        min-height: 440px;
        border-radius: 24px;
        border: 1px solid rgba(91,69,25,.13);
        background: #eee6da;
        box-shadow: 0 22px 55px rgba(56,38,9,.12);
      }

      .premium-map-wrap iframe {
        width: 100%;
        height: 355px;
        display: block;
        border: 0;
      }

      .premium-map-info {
        min-height: 85px;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 14px;
        padding: 15px 18px;
        background: #fff;
      }

      .premium-map-info > span {
        font-size: 28px;
      }

      .premium-map-info > div {
        display: grid;
        gap: 3px;
      }

      .premium-map-info small {
        color: #73695e;
      }

      .premium-map-info a {
        padding: 11px 15px;
        border-radius: 999px;
        color: #171006;
        background: linear-gradient(135deg, #f4d76c, #c99720);
        text-decoration: none;
        font-size: 13px;
        font-weight: 900;
      }

      @media (max-width: 1050px) {
        .premium-bestseller-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .premium-faq-grid {
          grid-template-columns: 1fr;
          gap: 28px;
        }
      }

      @media (max-width: 760px) {
        .premium-bestseller-grid {
          grid-template-columns: 1fr;
        }

        .premium-bestseller-image {
          min-height: 245px;
        }

        .premium-gallery-grid {
          display: grid;
          grid-template-columns: 1fr;
          grid-auto-rows: 260px;
        }

        .premium-gallery-item,
        .premium-gallery-item-1,
        .premium-gallery-item-6 {
          grid-column: auto;
          grid-row: auto;
        }

        .premium-map-wrap {
          min-height: 390px;
        }

        .premium-map-wrap iframe {
          height: 290px;
        }

        .premium-map-info {
          grid-template-columns: auto 1fr;
        }

        .premium-map-info a {
          grid-column: 1 / -1;
          text-align: center;
        }
      }

      @media (max-width: 1050px) {
        .premium-links {
          display: none;
        }

        .premium-menu-toggle {
          display: grid;
          place-items: center;
        }

        .premium-mobile-menu {
          display: grid;
          gap: 0;
          padding: 8px 20px 20px;
          background: rgba(8,6,4,.98);
          border-top: 1px solid rgba(212,175,55,.16);
        }

        .premium-mobile-menu > a {
          padding: 15px 4px;
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .premium-mobile-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding-top: 16px;
        }

        .premium-mobile-actions a {
          padding: 13px 10px;
          text-align: center;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 900;
          background: rgba(212,175,55,.12);
          color: #f3d364;
          border: 1px solid rgba(212,175,55,.23);
        }
      }

      @media (max-width: 760px) {
        body {
          padding-bottom: 74px;
        }

        .premium-nav {
          min-height: 72px;
          gap: 10px;
        }

        .premium-logo,
        .premium-logo-fallback {
          width: 46px;
          height: 46px;
          flex-basis: 46px;
        }

        .premium-brand-text strong {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 17px;
        }

        .premium-brand-text small {
          font-size: 10px;
        }

        .premium-action {
          display: none;
        }

        .premium-hero {
          min-height: 650px;
          background-position: 62% center;
        }

        .premium-hero-inner {
          padding-top: 80px;
          padding-bottom: 80px;
        }

        .premium-hero-copy {
          max-width: 100%;
        }

        .premium-kicker {
          font-size: 11px;
          letter-spacing: .14em;
        }

        .premium-hero h1 {
          font-size: clamp(43px, 14vw, 65px);
        }

        .premium-hero-buttons {
          display: grid;
          grid-template-columns: 1fr;
        }

        .premium-primary-button,
        .premium-secondary-button {
          width: 100%;
        }

        .premium-trust-row {
          display: grid;
          gap: 9px;
        }

        .premium-mobile-bar {
          position: fixed;
          left: 10px;
          right: 10px;
          bottom: 10px;
          z-index: 1400;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          overflow: hidden;
          border-radius: 18px;
          background: rgba(10,7,4,.96);
          border: 1px solid rgba(212,175,55,.22);
          box-shadow: 0 18px 46px rgba(0,0,0,.38);
          backdrop-filter: blur(16px);
        }

        .premium-mobile-bar a {
          min-height: 58px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          color: #f4d466;
          text-decoration: none;
          font-size: 11px;
          font-weight: 900;
          border-right: 1px solid rgba(255,255,255,.08);
        }

        .premium-mobile-bar a:last-child {
          border-right: 0;
        }

        .premium-mobile-bar span {
          font-size: 18px;
        }
      }

      @media (max-width: 420px) {
        .premium-brand-text {
          display: none;
        }

        .premium-mobile-actions {
          grid-template-columns: 1fr;
        }
      }
    `}</style>

    {notice && <div className="toast">{notice}</div>}
  </main>;
}