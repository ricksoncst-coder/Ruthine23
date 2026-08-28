"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  defaultDishes,
  defaultSettings,
  Dish,
  DISHES_KEY,
  RestaurantSettings,
  SETTINGS_KEY,
} from "../../lib/data";

const CATEGORIES_KEY = "costas_categories_v2";
const ADMIN_SESSION_KEY = "costas_admin";
const ADMIN_PIN = "2026";

async function compressImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () =>
      reject(new Error("Die Datei konnte nicht gelesen werden."));

    reader.onload = () => {
      const image = new Image();

      image.onerror = () =>
        reject(new Error("Das Bild konnte nicht verarbeitet werden."));

      image.onload = () => {
        const scale = Math.min(
          1,
          maxWidth / image.width,
          maxHeight / image.height
        );

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Bildverarbeitung ist nicht verfügbar."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

function uniqueCategories(dishes: Dish[]): string[] {
  return Array.from(
    new Set(
      dishes
        .map((dish) => dish.category?.trim())
        .filter((category): category is string => Boolean(category))
    )
  );
}

function makeNewDish(category: string): Dish {
  return {
    id: Date.now(),
    name: "Neues Gericht",
    category,
    description: "Beschreibung des Gerichts",
    price: 0,
    icon: "🍽️",
    image: "",
    vegetarian: false,
    vegan: false,
    spicy: false,
    active: true,
  };
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [pin, setPin] = useState("");
  const [dishes, setDishes] = useState<Dish[]>(defaultDishes);
  const [settings, setSettings] =
    useState<RestaurantSettings>(defaultSettings);

  const [categories, setCategories] = useState<string[]>(
    uniqueCategories(defaultDishes)
  );
  const [newCategory, setNewCategory] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Alle");
  const [dishSearch, setDishSearch] = useState("");

  const [message, setMessage] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedDishes = localStorage.getItem(DISHES_KEY);
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      const storedCategories = localStorage.getItem(CATEGORIES_KEY);

      const loadedDishes: Dish[] = storedDishes
        ? JSON.parse(storedDishes)
        : defaultDishes;

      setDishes(loadedDishes);

      if (storedSettings) {
        setSettings({
          ...defaultSettings,
          ...JSON.parse(storedSettings),
        });
      }

      if (storedCategories) {
        const parsedCategories = JSON.parse(storedCategories);
        if (Array.isArray(parsedCategories)) {
          setCategories(
            parsedCategories.filter(
              (item): item is string =>
                typeof item === "string" && item.trim().length > 0
            )
          );
        }
      } else {
        setCategories(uniqueCategories(loadedDishes));
      }

      setLoggedIn(sessionStorage.getItem(ADMIN_SESSION_KEY) === "yes");
    } catch {
      setMessage(
        "Gespeicherte Daten konnten nicht geladen werden. Standarddaten sind aktiv."
      );
    }
  }, []);

  const filteredDishes = useMemo(() => {
    const term = dishSearch.trim().toLocaleLowerCase("de-DE");

    return dishes.filter((dish) => {
      const matchesCategory =
        categoryFilter === "Alle" || dish.category === categoryFilter;

      const matchesSearch =
        !term ||
        `${dish.name} ${dish.description} ${dish.category}`
          .toLocaleLowerCase("de-DE")
          .includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [dishes, categoryFilter, dishSearch]);

  function markChanged(text = "Änderung vorbereitet. Bitte speichern.") {
    setIsDirty(true);
    setMessage(text);
  }

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pin === ADMIN_PIN) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "yes");
      setLoggedIn(true);
      setPin("");
      setMessage("");
      return;
    }

    setMessage("Falsche PIN. Standard-PIN: 2026");
  }

  function logout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setLoggedIn(false);
    setPin("");
  }

  function save() {
    try {
      localStorage.setItem(DISHES_KEY, JSON.stringify(dishes));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));

      setIsDirty(false);
      setMessage(
        "Alles gespeichert. Lade die Startseite neu, damit die Änderungen sichtbar werden."
      );
    } catch {
      setMessage(
        "Speichern fehlgeschlagen. Ein Bild ist möglicherweise zu groß."
      );
    }
  }

  function updateSettings<K extends keyof RestaurantSettings>(
    field: K,
    value: RestaurantSettings[K]
  ) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
    markChanged();
  }

  function updateDish<K extends keyof Dish>(
    id: number,
    field: K,
    value: Dish[K]
  ) {
    setDishes((current) =>
      current.map((dish) =>
        dish.id === id ? { ...dish, [field]: value } : dish
      )
    );
    markChanged();
  }

  function addDish() {
    const fallbackCategory =
      categoryFilter !== "Alle"
        ? categoryFilter
        : categories[0] || "Neue Kategorie";

    if (!categories.includes(fallbackCategory)) {
      setCategories((current) => [...current, fallbackCategory]);
    }

    const dish = makeNewDish(fallbackCategory);
    setDishes((current) => [dish, ...current]);
    setCategoryFilter(fallbackCategory);
    setDishSearch("");
    markChanged("Neues Gericht wurde angelegt. Bitte ausfüllen und speichern.");
  }

  function duplicateDish(dish: Dish) {
    const copy: Dish = {
      ...dish,
      id: Date.now(),
      name: `${dish.name} Kopie`,
    };

    setDishes((current) => [copy, ...current]);
    setCategoryFilter(dish.category);
    setDishSearch("");
    markChanged("Gericht wurde dupliziert. Bitte speichern.");
  }

  function deleteDish(id: number, name: string) {
    if (!window.confirm(`Gericht „${name}“ wirklich löschen?`)) return;

    setDishes((current) => current.filter((dish) => dish.id !== id));
    markChanged("Gericht wurde entfernt. Bitte speichern.");
  }

  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const category = newCategory.trim();

    if (!category) {
      setMessage("Bitte einen Kategorienamen eingeben.");
      return;
    }

    const alreadyExists = categories.some(
      (item) =>
        item.toLocaleLowerCase("de-DE") ===
        category.toLocaleLowerCase("de-DE")
    );

    if (alreadyExists) {
      setMessage("Diese Kategorie existiert bereits.");
      return;
    }

    setCategories((current) => [...current, category]);
    setNewCategory("");
    setCategoryFilter(category);
    markChanged(
      `Kategorie „${category}“ wurde angelegt. Jetzt kannst du ein Gericht hinzufügen.`
    );
  }

  function renameCategory(oldName: string) {
    const requestedName = window.prompt(
      "Neuer Kategoriename:",
      oldName
    );

    if (requestedName === null) return;

    const newName = requestedName.trim();

    if (!newName || newName === oldName) return;

    const duplicate = categories.some(
      (item) =>
        item !== oldName &&
        item.toLocaleLowerCase("de-DE") ===
          newName.toLocaleLowerCase("de-DE")
    );

    if (duplicate) {
      setMessage("Eine Kategorie mit diesem Namen existiert bereits.");
      return;
    }

    setCategories((current) =>
      current.map((item) => (item === oldName ? newName : item))
    );

    setDishes((current) =>
      current.map((dish) =>
        dish.category === oldName
          ? { ...dish, category: newName }
          : dish
      )
    );

    if (categoryFilter === oldName) {
      setCategoryFilter(newName);
    }

    markChanged(
      `Kategorie „${oldName}“ wurde in „${newName}“ umbenannt.`
    );
  }

  function deleteCategory(category: string) {
    const dishesInCategory = dishes.filter(
      (dish) => dish.category === category
    );

    if (dishesInCategory.length > 0) {
      setMessage(
        `Kategorie kann nicht gelöscht werden: ${dishesInCategory.length} Gericht(e) sind noch darin. Verschiebe oder lösche diese Gerichte zuerst.`
      );
      return;
    }

    if (!window.confirm(`Kategorie „${category}“ wirklich löschen?`)) {
      return;
    }

    setCategories((current) =>
      current.filter((item) => item !== category)
    );

    if (categoryFilter === category) {
      setCategoryFilter("Alle");
    }

    markChanged(`Kategorie „${category}“ wurde gelöscht.`);
  }

  async function uploadSettingImage(
    event: ChangeEvent<HTMLInputElement>,
    field: "heroImage" | "logoImage"
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const image = await compressImage(
        file,
        field === "logoImage" ? 700 : 1800,
        field === "logoImage" ? 700 : 1100
      );

      updateSettings(field, image);
      setMessage("Bild vorbereitet. Bitte noch „Alles speichern“ drücken.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Bild konnte nicht geladen werden."
      );
    }

    event.target.value = "";
  }

  async function uploadDishImage(
    event: ChangeEvent<HTMLInputElement>,
    id: number
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const image = await compressImage(file, 1000, 800);
      updateDish(id, "image", image);
      setMessage("Gerichtsfoto vorbereitet. Bitte speichern.");
    } catch {
      setMessage("Gerichtsfoto konnte nicht verarbeitet werden.");
    }

    event.target.value = "";
  }

  function exportBackup() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            settings,
            categories,
            dishes,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );

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

        if (data.settings) {
          setSettings({
            ...defaultSettings,
            ...data.settings,
          });
        }

        if (Array.isArray(data.dishes)) {
          setDishes(data.dishes);
        }

        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
        } else if (Array.isArray(data.dishes)) {
          setCategories(uniqueCategories(data.dishes));
        }

        setIsDirty(true);
        setMessage("Sicherung geladen. Bitte jetzt alles speichern.");
      } catch {
        setMessage("Diese Sicherungsdatei ist ungültig.");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  }

  function resetEverything() {
    if (
      !window.confirm(
        "Wirklich alle Änderungen löschen und Standardwerte wiederherstellen?"
      )
    ) {
      return;
    }

    localStorage.removeItem(DISHES_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(CATEGORIES_KEY);

    setDishes(defaultDishes);
    setSettings(defaultSettings);
    setCategories(uniqueCategories(defaultDishes));
    setCategoryFilter("Alle");
    setDishSearch("");
    setIsDirty(false);
    setMessage("Standardwerte wurden wiederhergestellt.");
  }

  if (!loggedIn) {
    return (
      <main className="admin-shell">
        <form className="admin-login" onSubmit={login}>
          <span className="brand-mark">C</span>
          <h1>Admin-Bereich</h1>
          <p>
            Restaurant, Kategorien, Gerichte, Bilder und Preise verwalten.
          </p>

          <label>
            PIN
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              autoFocus
              inputMode="numeric"
            />
          </label>

          <button className="button primary full" type="submit">
            Anmelden
          </button>

          {message && <p className="admin-message">{message}</p>}

          <a href="/">← Zur Website</a>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <div className="admin-page">
        <div className="admin-top">
          <div>
            <p className="eyebrow dark">Website-Editor</p>
            <h1>Website bearbeiten</h1>
            <p className="admin-subtitle">
              {dishes.length} Gerichte · {categories.length} Kategorien
              {isDirty ? " · Ungespeicherte Änderungen" : ""}
            </p>
          </div>

          <div className="admin-actions">
            <a className="button outline" href="/" target="_blank">
              Website ansehen
            </a>
            <button
              className="button outline"
              type="button"
              onClick={logout}
            >
              Abmelden
            </button>
            <button
              className="button primary"
              type="button"
              onClick={save}
            >
              Alles speichern
            </button>
          </div>
        </div>

        {message && <div className="admin-message">{message}</div>}

        <section className="admin-card">
          <h2>Design & Startseite</h2>

          <div className="admin-grid">
            <label>
              Restaurantname
              <input
                value={settings.name}
                onChange={(event) =>
                  updateSettings("name", event.target.value)
                }
              />
            </label>

            <label>
              Kurzname
              <input
                value={settings.shortName}
                onChange={(event) =>
                  updateSettings("shortName", event.target.value)
                }
              />
            </label>

            <label>
              Große Überschrift
              <input
                value={settings.heroTitle}
                onChange={(event) =>
                  updateSettings("heroTitle", event.target.value)
                }
              />
            </label>

            <label>
              Slogan
              <input
                value={settings.slogan}
                onChange={(event) =>
                  updateSettings("slogan", event.target.value)
                }
              />
            </label>

            <label>
              Akzentfarbe
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(event) =>
                  updateSettings("primaryColor", event.target.value)
                }
              />
            </label>
          </div>

          <div className="image-editor-grid">
            <div className="image-editor">
              <h3>Hintergrundbild</h3>

              <div
                className="image-preview hero-preview"
                style={
                  settings.heroImage
                    ? {
                        backgroundImage: `url(${settings.heroImage})`,
                      }
                    : undefined
                }
              >
                {!settings.heroImage && <span>Noch kein Bild</span>}
              </div>

              <label className="upload-button">
                Bild auswählen
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadSettingImage(event, "heroImage")
                  }
                />
              </label>

              {settings.heroImage && (
                <button
                  className="delete-button"
                  type="button"
                  onClick={() => updateSettings("heroImage", "")}
                >
                  Bild entfernen
                </button>
              )}
            </div>

            <div className="image-editor">
              <h3>Logo</h3>

              <div className="image-preview logo-preview">
                {settings.logoImage ? (
                  <img
                    src={settings.logoImage}
                    alt="Logo Vorschau"
                  />
                ) : (
                  <span>Noch kein Logo</span>
                )}
              </div>

              <label className="upload-button">
                Logo auswählen
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadSettingImage(event, "logoImage")
                  }
                />
              </label>

              {settings.logoImage && (
                <button
                  className="delete-button"
                  type="button"
                  onClick={() => updateSettings("logoImage", "")}
                >
                  Logo entfernen
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="admin-card">
          <h2>Restaurant-Daten</h2>

          <div className="admin-grid">
            <label>
              Telefon
              <input
                value={settings.phone}
                onChange={(event) =>
                  updateSettings("phone", event.target.value)
                }
              />
            </label>

            <label>
              WhatsApp mit Ländercode
              <input
                value={settings.whatsapp}
                onChange={(event) =>
                  updateSettings("whatsapp", event.target.value)
                }
                placeholder="491234567890"
              />
            </label>

            <label>
              E-Mail
              <input
                type="email"
                value={settings.email}
                onChange={(event) =>
                  updateSettings("email", event.target.value)
                }
              />
            </label>

            <label>
              Straße
              <input
                value={settings.street}
                onChange={(event) =>
                  updateSettings("street", event.target.value)
                }
              />
            </label>

            <label>
              PLZ / Ort
              <input
                value={settings.city}
                onChange={(event) =>
                  updateSettings("city", event.target.value)
                }
              />
            </label>

            <label>
              Öffnungszeiten
              <input
                value={settings.openingHours}
                onChange={(event) =>
                  updateSettings("openingHours", event.target.value)
                }
              />
            </label>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-section-head">
            <div>
              <h2>Kategorien</h2>
              <p>
                Neue Kategorien anlegen, umbenennen oder leere Kategorien
                löschen.
              </p>
            </div>
          </div>

          <form
            className="category-create-form"
            onSubmit={addCategory}
          >
            <input
              value={newCategory}
              onChange={(event) =>
                setNewCategory(event.target.value)
              }
              placeholder="Zum Beispiel: Tandoori Spezialitäten"
            />
            <button className="button primary" type="submit">
              + Kategorie hinzufügen
            </button>
          </form>

          <div className="category-manager-list">
            {categories.map((category) => {
              const count = dishes.filter(
                (dish) => dish.category === category
              ).length;

              return (
                <div className="category-manager-item" key={category}>
                  <div>
                    <strong>{category}</strong>
                    <small>
                      {count} {count === 1 ? "Gericht" : "Gerichte"}
                    </small>
                  </div>

                  <div className="category-manager-actions">
                    <button
                      className="button outline compact"
                      type="button"
                      onClick={() => renameCategory(category)}
                    >
                      Umbenennen
                    </button>

                    <button
                      className="delete-button"
                      type="button"
                      disabled={count > 0}
                      title={
                        count > 0
                          ? "Verschiebe oder lösche zuerst alle Gerichte."
                          : "Kategorie löschen"
                      }
                      onClick={() => deleteCategory(category)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              );
            })}

            {!categories.length && (
              <p>Noch keine Kategorie vorhanden.</p>
            )}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-section-head">
            <div>
              <h2>Speisekarte</h2>
              <p>
                Neue Gerichte hinzufügen, Kategorie ändern, Bilder
                hochladen und Preise bearbeiten.
              </p>
            </div>

            <button
              className="button primary"
              type="button"
              onClick={addDish}
            >
              + Neues Gericht
            </button>
          </div>

          <div className="dish-admin-toolbar">
            <label>
              Gerichte suchen
              <input
                value={dishSearch}
                onChange={(event) =>
                  setDishSearch(event.target.value)
                }
                placeholder="Name, Beschreibung oder Kategorie"
              />
            </label>

            <label>
              Kategorie anzeigen
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
              >
                <option value="Alle">Alle Kategorien</option>
                {categories.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="dish-result-count">
            {filteredDishes.length} von {dishes.length} Gerichten
          </p>

          <div className="admin-dishes">
            {filteredDishes.map((dish) => (
              <article className="admin-dish improved" key={dish.id}>
                <div className="dish-image-admin">
                  {dish.image ? (
                    <img src={dish.image} alt={dish.name} />
                  ) : (
                    <span>{dish.icon || "🍽️"}</span>
                  )}

                  <label>
                    Foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        uploadDishImage(event, dish.id)
                      }
                    />
                  </label>

                  {dish.image && (
                    <button
                      className="small-remove-image"
                      type="button"
                      onClick={() =>
                        updateDish(dish.id, "image", "")
                      }
                    >
                      Foto entfernen
                    </button>
                  )}
                </div>

                <div className="admin-dish-fields">
                  <label>
                    Name
                    <input
                      value={dish.name}
                      onChange={(event) =>
                        updateDish(
                          dish.id,
                          "name",
                          event.target.value
                        )
                      }
                      placeholder="Gericht"
                    />
                  </label>

                  <label>
                    Kategorie
                    <select
                      value={dish.category}
                      onChange={(event) =>
                        updateDish(
                          dish.id,
                          "category",
                          event.target.value
                        )
                      }
                    >
                      {categories.map((category) => (
                        <option value={category} key={category}>
                          {category}
                        </option>
                      ))}

                      {!categories.includes(dish.category) && (
                        <option value={dish.category}>
                          {dish.category}
                        </option>
                      )}
                    </select>
                  </label>

                  <label className="wide">
                    Beschreibung
                    <textarea
                      value={dish.description}
                      onChange={(event) =>
                        updateDish(
                          dish.id,
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="Beschreibung"
                      rows={3}
                    />
                  </label>

                  <label>
                    Symbol
                    <input
                      value={dish.icon || ""}
                      onChange={(event) =>
                        updateDish(
                          dish.id,
                          "icon",
                          event.target.value
                        )
                      }
                      placeholder="🍽️"
                    />
                  </label>

                  <label>
                    Preis in Euro
                    <input
                      type="number"
                      min="0"
                      step="0.10"
                      value={dish.price}
                      onChange={(event) =>
                        updateDish(
                          dish.id,
                          "price",
                          Number(event.target.value)
                        )
                      }
                    />
                  </label>
                </div>

                <div className="dish-options">
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={dish.active !== false}
                      onChange={(event) =>
                        updateDish(
                          dish.id,
                          "active",
                          event.target.checked
                        )
                      }
                    />
                    Sichtbar
                  </label>

                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={dish.vegetarian === true}
                      onChange={(event) =>
                        updateDish(
                          dish.id,
                          "vegetarian",
                          event.target.checked
                        )
                      }
                    />
                    Vegetarisch
                  </label>

                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={dish.vegan === true}
                      onChange={(event) =>
                        updateDish(
                          dish.id,
                          "vegan",
                          event.target.checked
                        )
                      }
                    />
                    Vegan
                  </label>

                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={dish.spicy === true}
                      onChange={(event) =>
                        updateDish(
                          dish.id,
                          "spicy",
                          event.target.checked
                        )
                      }
                    />
                    Scharf
                  </label>
                </div>

                <div className="dish-admin-actions">
                  <button
                    className="button outline compact"
                    type="button"
                    onClick={() => duplicateDish(dish)}
                  >
                    Duplizieren
                  </button>

                  <button
                    className="delete-button"
                    type="button"
                    onClick={() =>
                      deleteDish(dish.id, dish.name)
                    }
                  >
                    Gericht löschen
                  </button>
                </div>
              </article>
            ))}

            {!filteredDishes.length && (
              <div className="admin-empty-state">
                <span>🍽️</span>
                <h3>Keine Gerichte gefunden</h3>
                <p>
                  Ändere den Filter oder füge ein neues Gericht hinzu.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="admin-card">
          <h2>Sicherung</h2>
          <p>
            Speichere Einstellungen, Kategorien und Gerichte als Datei
            oder lade sie später wieder ein.
          </p>

          <div className="admin-actions">
            <button
              className="button outline"
              type="button"
              onClick={exportBackup}
            >
              Sicherung herunterladen
            </button>

            <button
              className="button outline"
              type="button"
              onClick={() => importRef.current?.click()}
            >
              Sicherung laden
            </button>

            <input
              ref={importRef}
              hidden
              type="file"
              accept="application/json"
              onChange={importBackup}
            />
          </div>
        </section>

        <div className="admin-bottom">
          <button
            className="button primary"
            type="button"
            onClick={save}
          >
            Änderungen speichern
          </button>

          <button
            className="button outline"
            type="button"
            onClick={resetEverything}
          >
            Zurücksetzen
          </button>
        </div>

        <p className="admin-warning">
          <b>Wichtig:</b> Diese Datei speichert aktuell im Browser dieses
          Geräts. Damit Änderungen automatisch auf allen Geräten und
          online erscheinen, muss dieser Admin-Bereich anschließend mit
          Supabase verbunden werden.
        </p>
      </div>

      <style jsx global>{`
        .admin-subtitle {
          margin: 8px 0 0;
          color: #6f675d;
          font-size: 14px;
        }

        .category-create-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          margin-top: 20px;
        }

        .category-create-form input,
        .dish-admin-toolbar input,
        .dish-admin-toolbar select,
        .admin-dish-fields select,
        .admin-dish-fields textarea {
          width: 100%;
          border: 1px solid #ded7cd;
          border-radius: 12px;
          background: #fff;
          padding: 12px 14px;
          font: inherit;
        }

        .category-manager-list {
          display: grid;
          gap: 10px;
          margin-top: 20px;
        }

        .category-manager-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 14px 16px;
          border: 1px solid #e7dfd3;
          border-radius: 14px;
          background: #fffdf9;
        }

        .category-manager-item > div:first-child {
          display: grid;
          gap: 3px;
        }

        .category-manager-item small {
          color: #7b7268;
        }

        .category-manager-actions,
        .dish-admin-actions,
        .dish-options {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .button.compact {
          min-height: 38px;
          padding: 8px 13px;
          font-size: 13px;
        }

        .delete-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .dish-admin-toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.6fr);
          gap: 14px;
          margin: 22px 0 10px;
        }

        .dish-admin-toolbar label,
        .admin-dish-fields label {
          display: grid;
          gap: 7px;
          color: #51493f;
          font-size: 13px;
          font-weight: 800;
        }

        .dish-result-count {
          color: #756c62;
          font-size: 14px;
        }

        .admin-dish.improved {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .admin-dish-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .admin-dish-fields .wide {
          grid-column: 1 / -1;
        }

        .admin-dish-fields textarea {
          min-height: 88px;
          resize: vertical;
        }

        .dish-options,
        .dish-admin-actions {
          grid-column: 2;
        }

        .dish-admin-actions {
          justify-content: flex-end;
          padding-top: 4px;
          border-top: 1px solid #eee7dc;
        }

        .small-remove-image {
          width: 100%;
          margin-top: 7px;
          border: 0;
          background: transparent;
          color: #a3362d;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
        }

        .admin-empty-state {
          padding: 46px 20px;
          text-align: center;
          border: 1px dashed #d9cdbd;
          border-radius: 16px;
          background: #fffcf7;
        }

        .admin-empty-state span {
          font-size: 40px;
        }

        .admin-empty-state h3 {
          margin: 10px 0 5px;
        }

        .admin-empty-state p {
          margin: 0;
          color: #766d63;
        }

        @media (max-width: 780px) {
          .category-create-form,
          .dish-admin-toolbar,
          .admin-dish.improved {
            grid-template-columns: 1fr;
          }

          .category-manager-item {
            align-items: flex-start;
            flex-direction: column;
          }

          .category-manager-actions {
            width: 100%;
          }

          .category-manager-actions button {
            flex: 1;
          }

          .admin-dish-fields {
            grid-template-columns: 1fr;
          }

          .admin-dish-fields .wide {
            grid-column: auto;
          }

          .dish-options,
          .dish-admin-actions {
            grid-column: 1;
          }

          .dish-admin-actions {
            justify-content: stretch;
          }

          .dish-admin-actions button {
            flex: 1;
          }
        }
      `}</style>
    </main>
  );
}
