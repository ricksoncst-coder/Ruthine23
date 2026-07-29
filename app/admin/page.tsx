"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { defaultDishes, defaultSettings, Dish, RestaurantSettings } from "../../lib/data";
import { dishFromRow, dishToRow, settingsFromRow, settingsToRow, supabase } from "../../lib/supabase";

async function compressImage(file: File, maxWidth = 1600, maxHeight = 1000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Bild konnte nicht verarbeitet werden."));
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Bildverarbeitung nicht verfügbar."));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Bild konnte nicht komprimiert werden.")), "image/jpeg", 0.82);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function uploadImage(blob: Blob, folder: string): Promise<string> {
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("restaurant-images").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from("restaurant-images").getPublicUrl(path).data.publicUrl;
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [pin, setPin] = useState("");
  const [dishes, setDishes] = useState<Dish[]>(defaultDishes);
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoggedIn(sessionStorage.getItem("costas_admin") === "yes");

    async function loadData() {
      const [settingsResult, dishesResult] = await Promise.all([
        supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("dishes").select("*").order("id"),
      ]);
      if (settingsResult.error) throw settingsResult.error;
      if (dishesResult.error) throw dishesResult.error;
      if (settingsResult.data) setSettings({ ...defaultSettings, ...settingsFromRow(settingsResult.data) });
      if (dishesResult.data && dishesResult.data.length > 0) setDishes(dishesResult.data.map(dishFromRow));
    }

    loadData().catch((error) => setMessage(`Laden fehlgeschlagen: ${error.message}`));
  }, []);

  function login(e: FormEvent) {
    e.preventDefault();
    if (pin === "2026") {
      sessionStorage.setItem("costas_admin", "yes");
      setLoggedIn(true);
      setMessage("");
    } else setMessage("Falsche PIN. Standard-PIN: 2026");
  }

  async function save() {
    setSaving(true);
    setMessage("Wird gespeichert …");
    try {
      const settingsResult = await supabase.from("restaurant_settings").upsert(settingsToRow(settings), { onConflict: "id" });
      if (settingsResult.error) throw settingsResult.error;

      const existingResult = await supabase.from("dishes").select("id");
      if (existingResult.error) throw existingResult.error;
      const currentIds = new Set(dishes.map((dish) => dish.id));
      const removedIds = (existingResult.data ?? []).map((row) => Number(row.id)).filter((id) => !currentIds.has(id));
      if (removedIds.length) {
        const deleteResult = await supabase.from("dishes").delete().in("id", removedIds);
        if (deleteResult.error) throw deleteResult.error;
      }

      if (dishes.length) {
        const dishesResult = await supabase.from("dishes").upsert(dishes.map(dishToRow), { onConflict: "id" });
        if (dishesResult.error) throw dishesResult.error;
      }
      setMessage("Erfolgreich online gespeichert. Die Startseite nach dem Neuladen zeigt die Änderungen.");
    } catch (error) {
      setMessage(error instanceof Error ? `Speichern fehlgeschlagen: ${error.message}` : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  function updateDish(id: number, field: keyof Dish, value: string | number | boolean) {
    setDishes((current) => current.map((dish) => dish.id === id ? { ...dish, [field]: value } : dish));
  }

  function addDish() {
    setDishes((current) => [...current, { id: Date.now(), name: "Neues Gericht", category: "Neue Kategorie", description: "Beschreibung", price: 0, icon: "🍽️", active: true }]);
  }

  async function uploadSettingImage(event: ChangeEvent<HTMLInputElement>, field: "heroImage" | "logoImage") {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setMessage("Bild wird hochgeladen …");
      const blob = await compressImage(file, field === "logoImage" ? 700 : 1800, field === "logoImage" ? 700 : 1100);
      const image = await uploadImage(blob, field === "logoImage" ? "logos" : "hero");
      setSettings((current) => ({ ...current, [field]: image }));
      setMessage("Bild hochgeladen. Bitte noch „Alles speichern“ drücken.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bild konnte nicht hochgeladen werden.");
    }
    event.target.value = "";
  }

  async function uploadDishImage(event: ChangeEvent<HTMLInputElement>, id: number) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setMessage("Gerichtsfoto wird hochgeladen …");
      const blob = await compressImage(file, 900, 700);
      updateDish(id, "image", await uploadImage(blob, "dishes"));
      setMessage("Gerichtsfoto hochgeladen. Bitte noch speichern.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gerichtsfoto konnte nicht hochgeladen werden.");
    }
    event.target.value = "";
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ settings, dishes }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "costas-website-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.settings) setSettings({ ...defaultSettings, ...data.settings });
        if (Array.isArray(data.dishes)) setDishes(data.dishes);
        setMessage("Sicherung geladen. Bitte speichern.");
      } catch {
        setMessage("Diese Sicherungsdatei ist ungültig.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function resetDefaults() {
    setDishes(defaultDishes);
    setSettings(defaultSettings);
    setMessage("Standardwerte geladen. Drücke „Änderungen speichern“, um sie online zu übernehmen.");
  }

  if (!loggedIn) return <main className="admin-shell"><form className="admin-login" onSubmit={login}><span className="brand-mark">C</span><h1>Admin-Bereich</h1><p>Name, Bilder, Preise und Kontaktdaten verwalten.</p><label>PIN<input type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus /></label><button className="button primary full">Anmelden</button>{message && <p className="admin-message">{message}</p>}<a href="/">← Zur Website</a></form></main>;

  return <main className="admin-shell"><div className="admin-page">
    <div className="admin-top"><div><p className="eyebrow dark">Website-Editor</p><h1>Website bearbeiten</h1></div><div className="admin-actions"><a className="button outline" href="/">Website ansehen</a><button className="button primary" onClick={save} disabled={saving}>{saving ? "Speichert …" : "Alles speichern"}</button></div></div>
    {message && <div className="admin-message">{message}</div>}

    <section className="admin-card"><h2>Design & Startseite</h2><div className="admin-grid">
      <label>Restaurantname<input value={settings.name} onChange={(e) => setSettings({...settings,name:e.target.value})}/></label>
      <label>Kurzname<input value={settings.shortName} onChange={(e) => setSettings({...settings,shortName:e.target.value})}/></label>
      <label>Große Überschrift<input value={settings.heroTitle} onChange={(e) => setSettings({...settings,heroTitle:e.target.value})}/></label>
      <label>Slogan<input value={settings.slogan} onChange={(e) => setSettings({...settings,slogan:e.target.value})}/></label>
      <label>Akzentfarbe<input type="color" value={settings.primaryColor} onChange={(e) => setSettings({...settings,primaryColor:e.target.value})}/></label>
    </div>
    <div className="image-editor-grid">
      <div className="image-editor"><h3>Hintergrundbild</h3><div className="image-preview hero-preview" style={settings.heroImage ? {backgroundImage:`url(${settings.heroImage})`} : undefined}>{!settings.heroImage && <span>Noch kein Bild</span>}</div><label className="upload-button">Bild auswählen<input type="file" accept="image/*" onChange={(e) => uploadSettingImage(e,"heroImage")}/></label>{settings.heroImage && <button className="delete-button" onClick={() => setSettings({...settings,heroImage:""})}>Bild entfernen</button>}</div>
      <div className="image-editor"><h3>Logo</h3><div className="image-preview logo-preview">{settings.logoImage ? <img src={settings.logoImage} alt="Logo Vorschau"/> : <span>Noch kein Logo</span>}</div><label className="upload-button">Logo auswählen<input type="file" accept="image/*" onChange={(e) => uploadSettingImage(e,"logoImage")}/></label>{settings.logoImage && <button className="delete-button" onClick={() => setSettings({...settings,logoImage:""})}>Logo entfernen</button>}</div>
    </div></section>

    <section className="admin-card"><h2>Restaurant-Daten</h2><div className="admin-grid">
      <label>Telefon<input value={settings.phone} onChange={(e) => setSettings({...settings,phone:e.target.value})}/></label>
      <label>WhatsApp mit Ländercode<input value={settings.whatsapp} onChange={(e) => setSettings({...settings,whatsapp:e.target.value})}/></label>
      <label>E-Mail<input value={settings.email} onChange={(e) => setSettings({...settings,email:e.target.value})}/></label>
      <label>Straße<input value={settings.street} onChange={(e) => setSettings({...settings,street:e.target.value})}/></label>
      <label>PLZ / Ort<input value={settings.city} onChange={(e) => setSettings({...settings,city:e.target.value})}/></label>
      <label>Öffnungszeiten<input value={settings.openingHours} onChange={(e) => setSettings({...settings,openingHours:e.target.value})}/></label>
    </div></section>

    <section className="admin-card"><div className="admin-section-head"><div><h2>Speisekarte</h2><p>Gerichte, Kategorien, Preise und Bilder bearbeiten.</p></div><button className="button outline" onClick={addDish}>+ Gericht hinzufügen</button></div><div className="admin-dishes">{dishes.map((dish) => <div className="admin-dish" key={dish.id}>
      <div className="dish-image-admin">{dish.image ? <img src={dish.image} alt=""/> : <span>{dish.icon}</span>}<label>Foto<input type="file" accept="image/*" onChange={(e) => uploadDishImage(e,dish.id)}/></label></div>
      <div className="admin-dish-fields"><input value={dish.name} onChange={(e) => updateDish(dish.id,"name",e.target.value)} placeholder="Gericht"/><input value={dish.category} onChange={(e) => updateDish(dish.id,"category",e.target.value)} placeholder="Kategorie"/><input value={dish.description} onChange={(e) => updateDish(dish.id,"description",e.target.value)} placeholder="Beschreibung"/><input value={dish.icon} onChange={(e) => updateDish(dish.id,"icon",e.target.value)} placeholder="Symbol"/></div>
      <label className="price-label">Preis €<input type="number" step="0.10" value={dish.price} onChange={(e) => updateDish(dish.id,"price",Number(e.target.value))}/></label>
      <label className="switch-label"><input type="checkbox" checked={dish.active !== false} onChange={(e) => updateDish(dish.id,"active",e.target.checked)}/> Sichtbar</label>
      <button className="delete-button" onClick={() => setDishes((current) => current.filter((item) => item.id !== dish.id))}>Löschen</button>
    </div>)}</div></section>

    <section className="admin-card"><h2>Sicherung</h2><p>Speichere deine Einstellungen als Datei oder lade sie später wieder ein.</p><div className="admin-actions"><button className="button outline" onClick={exportBackup}>Sicherung herunterladen</button><button className="button outline" onClick={() => importRef.current?.click()}>Sicherung laden</button><input ref={importRef} hidden type="file" accept="application/json" onChange={importBackup}/></div></section>

    <div className="admin-bottom"><button className="button primary" onClick={save} disabled={saving}>{saving ? "Speichert …" : "Änderungen speichern"}</button><button className="button outline" onClick={resetDefaults}>Zurücksetzen</button></div>
    <p className="admin-warning"><b>Supabase aktiv:</b> Änderungen und Bilder werden online gespeichert und sind auf allen Geräten sichtbar.</p>
  </div></main>;
}
