# Costa's Indian Cuisine – Phase 10 Complete

Vollständige Next.js-Restaurantwebsite für Vercel.

## Enthalten
- vollständige digitale Speisekarte laut bereitgestellten Menübildern
- Kategorien, Suche und Warenkorb
- WhatsApp-Bestellung und Reservierungsanfrage
- Kontaktdaten, Öffnungszeiten und Google Maps
- Admin-Editor unter `/admin`
- Restaurantname, Überschrift, Slogan, Farbe, Logo und Hintergrundbild ändern
- Gerichte, Preise, Kategorien und Bilder bearbeiten
- Sicherung exportieren und importieren

## Admin
Standard-PIN: `2026`

## Vercel
- Framework Preset: Next.js
- Root Directory: Ordner mit `package.json`
- Build/Output/Install Command: leer lassen
- Node.js: 20.x oder neuer

## Wichtiger Hinweis
Admin-Änderungen werden aktuell im Browser des verwendeten Geräts gespeichert. Für zentrale Änderungen auf allen Geräten ist eine Datenbank wie Supabase erforderlich.

## Phase 11 – Supabase

Diese Version speichert Restaurant-Einstellungen, Gerichte und Bilder in Supabase.

### Lokal starten

```bash
npm install
npm run dev
```

Die Datei `.env.local` enthält die lokale Supabase-Verbindung und wird durch `.gitignore` nicht zu GitHub hochgeladen.

### Vercel Environment Variables

In Vercel unter **Settings → Environment Variables** eintragen:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Danach ein neues Deployment starten.

### Erste Übernahme der Speisekarte

Beim ersten Öffnen zeigt die Website die Standardgerichte aus `lib/data.ts`. Im Admin-Bereich anmelden und einmal **Alles speichern** drücken. Dadurch werden alle Gerichte in die Supabase-Tabelle `dishes` geschrieben.
