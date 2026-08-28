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
  RestaurantSettings,
} from "../../lib/data";

import {
  dishFromRow,
  dishToRow,
  settingsFromRow,
  settingsToRow,
  supabase,
} from "../../lib/supabase";

const ADMIN_SESSION_KEY = "costas_admin";
const ADMIN_PIN = "2026";

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
    description: "",
    price: 0,
    icon: "🍽️",
    image: "",
    vegetarian: false,
    vegan: false,
    spicy: false,
    active: true,
  };
}

async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 900
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

        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
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

  const [categoryFilter, setCategoryFilter] = useState("Alle");
  const [newCategory, setNewCategory] = useState("");
  const [dishSearch, setDishSearch] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoggedIn(sessionStorage.getItem(ADMIN_SESSION_KEY) === "yes");

    loadFromSupabase();
  }, []);

  async function loadFromSupabase() {
    setLoading(true);
    setMessage("");

    try {
      const [settingsResult, dishesResult] = await Promise.all([
        supabase
          .from("restaurant_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle(),

        supabase
          .from("dishes")
          .select("*")
          .order("id"),
      ]);

      if (settingsResult.error) {
        throw settingsResult.error;
      }

      if (dishesResult.error) {
        throw dishesResult.error;
      }

      if (settingsResult.data) {
        setSettings({
          ...defaultSettings,
          ...settingsFromRow(settingsResult.data),
        });
      }

      if (dishesResult.data && dishesResult.data.length > 0) {
        const loadedDishes = dishesResult.data.map(dishFromRow);

        setDishes(loadedDishes);
        setCategories(uniqueCategories(loadedDishes));
      } else {
        setDishes(defaultDishes);
        setCategories(uniqueCategories(defaultDishes));
      }

      setIsDirty(false);
    } catch (error) {
      console.error(error);

      setMessage(
        "Daten konnten nicht von Supabase geladen werden. Standarddaten werden angezeigt."
      );
    } finally {
      setLoading(false);
    }
  }

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

  function markChanged(
    text = "Änderung vorbereitet. Bitte anschließend speichern."
  ) {
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

    setMessage("Falsche PIN.");
  }

  function logout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setLoggedIn(false);
    setPin("");
  }

  async function save() {
    if (saving) return;

    setSaving(true);
    setMessage("Wird gespeichert …");

    try {
      const settingsResult = await supabase
        .from("restaurant_settings")
        .upsert(settingsToRow(settings), {
          onConflict: "id",
        });

      if (settingsResult.error) {
        throw settingsResult.error;
      }

      const existingResult = await supabase
        .from("dishes")
        .select("id");

      if (existingResult.error) {
        throw existingResult.error;
      }

      const existingIds = (existingResult.data ?? []).map((row) =>
        Number(row.id)
      );

      const currentIds = dishes.map((dish) => dish.id);

      const removedIds = existingIds.filter(
        (id) => !currentIds.includes(id)
      );

      if (removedIds.length > 0) {
        const deleteResult = await supabase
          .from("dishes")
          .delete()
          .in("id", removedIds);

        if (deleteResult.error) {
          throw deleteResult.error;
        }
      }

      if (dishes.length > 0) {
        const dishesResult = await supabase
          .from("dishes")
          .upsert(dishes.map(dishToRow), {
            onConflict: "id",
          });

        if (dishesResult.error) {
          throw dishesResult.error;
        }
      }

      setIsDirty(false);
      setMessage("✓ Alles online gespeichert.");
    } catch (error) {
      console.error(error);

      const text =
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler";

      setMessage(`Speichern fehlgeschlagen: ${text}`);
    } finally {
      setSaving(false);
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
        dish.id === id
          ? {
              ...dish,
              [field]: value,
            }
          : dish
      )
    );

    markChanged();
  }

  function addDish() {
    const category =
      categoryFilter !== "Alle"
        ? categoryFilter
        : categories[0] || "Neue Kategorie";

    if (!categories.includes(category)) {
      setCategories((current) => [...current, category]);
    }

    const dish = makeNewDish(category);

    setDishes((current) => [dish, ...current]);
    setCategoryFilter(category);
    setDishSearch("");

    markChanged("Neues Gericht angelegt. Bitte ausfüllen und speichern.");
  }

  function duplicateDish(dish: Dish) {
    const copy: Dish = {
      ...dish,
      id: Date.now(),
      name: `${dish.name} Kopie`,
    };

    setDishes((current) => [copy, ...current]);

    markChanged("Gericht dupliziert. Bitte speichern.");
  }

  function deleteDish(id: number, name: string) {
    if (!window.confirm(`Gericht „${name}“ wirklich löschen?`)) {
      return;
    }

    setDishes((current) =>
      current.filter((dish) => dish.id !== id)
    );

    markChanged("Gericht entfernt. Bitte speichern.");
  }

  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const category = newCategory.trim();

    if (!category) {
      setMessage("Bitte einen Kategorienamen eingeben.");
      return;
    }

    const exists = categories.some(
      (item) =>
        item.toLocaleLowerCase("de-DE") ===
        category.toLocaleLowerCase("de-DE")
    );

    if (exists) {
      setMessage("Diese Kategorie existiert bereits.");
      return;
    }

    setCategories((current) => [...current, category]);
    setNewCategory("");
    setCategoryFilter(category);

    markChanged(
      `Kategorie „${category}“ angelegt. Jetzt kannst du ein Gericht hinzufügen.`
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
      setMessage("Diese Kategorie existiert bereits.");
      return;
    }

    setCategories((current) =>
      current.map((item) =>
        item === oldName ? newName : item
      )
    );

    setDishes((current) =>
      current.map((dish) =>
        dish.category === oldName
          ? {
              ...dish,
              category: newName,
            }
          : dish
      )
    );

    if (categoryFilter === oldName) {
      setCategoryFilter(newName);
    }

    markChanged(
      `Kategorie „${oldName}“ wurde umbenannt.`
    );
  }

  function deleteCategory(category: string) {
    const count = dishes.filter(
      (dish) => dish.category === category
    ).length;

    if (count > 0) {
      setMessage(
        `Kategorie kann nicht gelöscht werden. Noch ${count} Gericht(e) vorhanden.`
      );
      return;
    }

    if (!window.confirm(`Kategorie „${category}“ löschen?`)) {
      return;
    }

    setCategories((current) =>
      current.filter((item) => item !== category)
    );

    if (categoryFilter === category) {
      setCategoryFilter("Alle");
    }

    markChanged();
  }

  async function uploadSettingImage(
    event: ChangeEvent<HTMLInputElement>,
    field: "heroImage" | "logoImage"
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setMessage("Bild wird verarbeitet …");

      const image = await compressImage(
        file,
        field === "logoImage" ? 700 : 1600,
        field === "logoImage" ? 700 : 1000
      );

      updateSettings(field, image);

      setMessage(
        "Bild vorbereitet. Jetzt bitte „Alles speichern“ drücken."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Bild konnte nicht verarbeitet werden."
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
      setMessage("Gerichtsfoto wird verarbeitet …");

      const image = await compressImage(file, 900, 700);

      updateDish(id, "image", image);

      setMessage(
        "Gerichtsfoto vorbereitet. Bitte speichern."
      );
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
      {
        type: "application/json",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "costas-website-backup.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  function importBackup(
    event: ChangeEvent<HTMLInputElement>
  ) {
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

        setMessage(
          "Sicherung geladen. Bitte jetzt online speichern."
        );
      } catch {
        setMessage("Diese Sicherungsdatei ist ungültig.");
      }
    };

    reader.readAsText(file);

    event.target.value = "";
  }

  if (!loggedIn) {
    return (
      <main className="admin-shell">
        <form
          className="admin-login"
          onSubmit={login}
        >
          <div className="admin-logo">C</div>

          <h1>Costa&apos;s Admin</h1>

          <p>
            Restaurant und Speisekarte verwalten
          </p>

          <label>
            PIN
            <input
              type="password"
              value={pin}
              onChange={(event) =>
                setPin(event.target.value)
              }
              inputMode="numeric"
              autoFocus
            />
          </label>

          <button
            className="button primary full"
            type="submit"
          >
            Anmelden
          </button>

          {message && (
            <p className="admin-message">{message}</p>
          )}

          <a href="/">← Zur Website</a>
        </form>

        <AdminStyles />
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <div className="admin-page">

        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">
              Costa&apos;s Indian Cuisine
            </p>

            <h1>Website bearbeiten</h1>

            <p className="admin-subtitle">
              {dishes.length} Gerichte ·{" "}
              {categories.length} Kategorien
              {isDirty
                ? " · Änderungen noch nicht gespeichert"
                : " · Alles gespeichert"}
            </p>
          </div>

          <div className="admin-actions">
            <a
              className="button outline"
              href="/"
              target="_blank"
            >
              Website ansehen
            </a>

            <button
              className="button outline"
              type="button"
              onClick={loadFromSupabase}
            >
              Neu laden
            </button>

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
              disabled={saving}
              onClick={save}
            >
              {saving
                ? "Speichert …"
                : "Alles speichern"}
            </button>
          </div>
        </header>

        {loading && (
          <div className="admin-message">
            Daten werden geladen …
          </div>
        )}

        {message && (
          <div className="admin-message">
            {message}
          </div>
        )}

        <section className="admin-card">
          <h2>Restaurant</h2>

          <div className="admin-grid">
            <label>
              Restaurantname
              <input
                value={settings.name}
                onChange={(event) =>
                  updateSettings(
                    "name",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Kurzname
              <input
                value={settings.shortName}
                onChange={(event) =>
                  updateSettings(
                    "shortName",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="wide">
              Überschrift
              <input
                value={settings.heroTitle}
                onChange={(event) =>
                  updateSettings(
                    "heroTitle",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="wide">
              Slogan
              <input
                value={settings.slogan}
                onChange={(event) =>
                  updateSettings(
                    "slogan",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Telefon
              <input
                value={settings.phone}
                onChange={(event) =>
                  updateSettings(
                    "phone",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              WhatsApp
              <input
                value={settings.whatsapp}
                onChange={(event) =>
                  updateSettings(
                    "whatsapp",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              E-Mail
              <input
                type="email"
                value={settings.email}
                onChange={(event) =>
                  updateSettings(
                    "email",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Straße
              <input
                value={settings.street}
                onChange={(event) =>
                  updateSettings(
                    "street",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              PLZ / Ort
              <input
                value={settings.city}
                onChange={(event) =>
                  updateSettings(
                    "city",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Öffnungszeiten
              <input
                value={settings.openingHours}
                onChange={(event) =>
                  updateSettings(
                    "openingHours",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Akzentfarbe
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(event) =>
                  updateSettings(
                    "primaryColor",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className="admin-card">
          <h2>Bilder</h2>

          <div className="image-grid">
            <div className="image-box">
              <h3>Hintergrundbild</h3>

              {settings.heroImage ? (
                <img
                  src={settings.heroImage}
                  alt="Hintergrund"
                />
              ) : (
                <div className="image-placeholder">
                  Kein Bild
                </div>
              )}

              <label className="upload-button">
                Bild auswählen
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadSettingImage(
                      event,
                      "heroImage"
                    )
                  }
                />
              </label>
            </div>

            <div className="image-box">
              <h3>Logo</h3>

              {settings.logoImage ? (
                <img
                  src={settings.logoImage}
                  alt="Logo"
                />
              ) : (
                <div className="image-placeholder">
                  Kein Logo
                </div>
              )}

              <label className="upload-button">
                Logo auswählen
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadSettingImage(
                      event,
                      "logoImage"
                    )
                  }
                />
              </label>
            </div>
          </div>
        </section>

        <section className="admin-card">
          <h2>Kategorien</h2>

          <form
            className="category-form"
            onSubmit={addCategory}
          >
            <input
              value={newCategory}
              onChange={(event) =>
                setNewCategory(event.target.value)
              }
              placeholder="Neue Kategorie"
            />

            <button
              className="button primary"
              type="submit"
            >
              + Kategorie
            </button>
          </form>

          <div className="category-list">
            {categories.map((category) => {
              const count = dishes.filter(
                (dish) =>
                  dish.category === category
              ).length;

              return (
                <div
                  className="category-item"
                  key={category}
                >
                  <div>
                    <strong>{category}</strong>
                    <small>
                      {count}{" "}
                      {count === 1
                        ? "Gericht"
                        : "Gerichte"}
                    </small>
                  </div>

                  <div className="row-actions">
                    <button
                      className="button outline small"
                      type="button"
                      onClick={() =>
                        renameCategory(category)
                      }
                    >
                      Umbenennen
                    </button>

                    <button
                      className="danger small"
                      type="button"
                      disabled={count > 0}
                      onClick={() =>
                        deleteCategory(category)
                      }
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="admin-card">
          <div className="section-head">
            <div>
              <h2>Speisekarte</h2>
              <p>
                Gerichte, Preise und Bilder bearbeiten
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

          <div className="toolbar">
            <input
              value={dishSearch}
              onChange={(event) =>
                setDishSearch(event.target.value)
              }
              placeholder="Gericht suchen …"
            />

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
            >
              <option value="Alle">
                Alle Kategorien
              </option>

              {categories.map((category) => (
                <option
                  value={category}
                  key={category}
                >
                  {category}
                </option>
              ))}
            </select>
          </div>

          <p className="result-count">
            {filteredDishes.length} von{" "}
            {dishes.length} Gerichten
          </p>

          <div className="dish-list">
            {filteredDishes.map((dish) => (
              <article
                className="dish-card"
                key={dish.id}
              >
                <div className="dish-image">
                  {dish.image ? (
                    <img
                      src={dish.image}
                      alt={dish.name}
                    />
                  ) : (
                    <span>
                      {dish.icon || "🍽️"}
                    </span>
                  )}

                  <label className="upload-small">
                    Foto ändern
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        uploadDishImage(
                          event,
                          dish.id
                        )
                      }
                    />
                  </label>
                </div>

                <div className="dish-fields">
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
                      {categories.map(
                        (category) => (
                          <option
                            value={category}
                            key={category}
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="wide">
                    Beschreibung
                    <textarea
                      value={dish.description}
                      rows={3}
                      onChange={(event) =>
                        updateDish(
                          dish.id,
                          "description",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label>
                    Preis €
                    <input
                      type="number"
                      min="0"
                      step="0.10"
                      value={dish.price}
                      onChange={(event) =>
                        updateDish(
                          dish.id,
                          "price",
                          Number(
                            event.target.value
                          )
                        )
                      }
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
                    />
                  </label>
                </div>

                <div className="options">
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        dish.active !== false
                      }
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

                  <label>
                    <input
                      type="checkbox"
                      checked={
                        dish.vegetarian === true
                      }
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

                  <label>
                    <input
                      type="checkbox"
                      checked={
                        dish.vegan === true
                      }
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

                  <label>
                    <input
                      type="checkbox"
                      checked={
                        dish.spicy === true
                      }
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

                <div className="dish-actions">
                  <button
                    className="button outline small"
                    type="button"
                    onClick={() =>
                      duplicateDish(dish)
                    }
                  >
                    Duplizieren
                  </button>

                  <button
                    className="danger small"
                    type="button"
                    onClick={() =>
                      deleteDish(
                        dish.id,
                        dish.name
                      )
                    }
                  >
                    Löschen
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <h2>Sicherung</h2>

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
              onClick={() =>
                importRef.current?.click()
              }
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

        <div className="save-bar">
          <span>
            {isDirty
              ? "Änderungen noch nicht gespeichert"
              : "Alles gespeichert ✓"}
          </span>

          <button
            className="button primary"
            type="button"
            disabled={saving}
            onClick={save}
          >
            {saving
              ? "Speichert …"
              : "Änderungen online speichern"}
          </button>
        </div>
      </div>

      <AdminStyles />
    </main>
  );
}

function AdminStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      .admin-shell {
        min-height: 100vh;
        background: #f5f1ea;
        color: #261f19;
        padding: 30px 18px 120px;
      }

      .admin-page {
        max-width: 1180px;
        margin: 0 auto;
      }

      .admin-header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: flex-start;
        margin-bottom: 24px;
      }

      .admin-header h1 {
        margin: 4px 0;
        font-size: 34px;
      }

      .admin-eyebrow {
        margin: 0;
        color: #b36b00;
        font-size: 13px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .admin-subtitle {
        margin: 8px 0 0;
        color: #746b62;
      }

      .admin-actions,
      .row-actions,
      .dish-actions,
      .options {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }

      .admin-card {
        background: #ffffff;
        border: 1px solid #e5ddd2;
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 20px;
        box-shadow: 0 8px 28px rgba(50, 35, 20, 0.04);
      }

      .admin-card h2 {
        margin-top: 0;
      }

      .admin-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .admin-grid .wide,
      .dish-fields .wide {
        grid-column: 1 / -1;
      }

      label {
        display: grid;
        gap: 7px;
        font-size: 13px;
        font-weight: 800;
      }

      input,
      textarea,
      select {
        width: 100%;
        border: 1px solid #ddd4c8;
        border-radius: 12px;
        background: white;
        padding: 12px 14px;
        font: inherit;
        color: #261f19;
      }

      textarea {
        resize: vertical;
      }

      .button,
      .danger {
        border-radius: 11px;
        border: 0;
        padding: 11px 16px;
        cursor: pointer;
        font-weight: 800;
        text-decoration: none;
        font-size: 14px;
      }

      .button.primary {
        background: #b36b00;
        color: white;
      }

      .button.outline {
        border: 1px solid #d8cec1;
        background: white;
        color: #32291f;
      }

      .button.full {
        width: 100%;
      }

      .button.small,
      .danger.small {
        padding: 8px 12px;
        font-size: 12px;
      }

      .danger {
        background: #fff0ee;
        color: #a32b20;
      }

      .danger:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      button:disabled {
        opacity: 0.6;
        cursor: wait;
      }

      .admin-message {
        max-width: 1180px;
        margin: 0 auto 18px;
        background: #fff7dd;
        border: 1px solid #e7d19b;
        border-radius: 12px;
        padding: 12px 16px;
      }

      .image-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
      }

      .image-box {
        border: 1px solid #e6ded3;
        border-radius: 16px;
        padding: 16px;
      }

      .image-box img,
      .image-placeholder {
        width: 100%;
        height: 220px;
        object-fit: contain;
        border-radius: 12px;
        background: #f7f3ed;
      }

      .image-placeholder {
        display: grid;
        place-items: center;
        color: #8c8379;
      }

      .upload-button,
      .upload-small {
        margin-top: 12px;
        display: inline-flex;
        justify-content: center;
        cursor: pointer;
        border-radius: 10px;
        background: #f0e7db;
        padding: 10px 14px;
      }

      .upload-button input,
      .upload-small input {
        display: none;
      }

      .category-form {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
      }

      .category-list {
        display: grid;
        gap: 10px;
        margin-top: 18px;
      }

      .category-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        padding: 13px 15px;
        border: 1px solid #ebe4da;
        border-radius: 12px;
      }

      .category-item > div:first-child {
        display: grid;
        gap: 3px;
      }

      .category-item small {
        color: #7a7168;
      }

      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
      }

      .section-head p {
        color: #786f66;
      }

      .toolbar {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 12px;
        margin: 20px 0 8px;
      }

      .result-count {
        color: #7b7268;
        font-size: 13px;
      }

      .dish-list {
        display: grid;
        gap: 15px;
      }

      .dish-card {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 18px;
        border: 1px solid #e7dfd5;
        border-radius: 16px;
        padding: 16px;
        background: #fffdf9;
      }

      .dish-image {
        grid-row: span 3;
      }

      .dish-image img,
      .dish-image > span {
        width: 140px;
        height: 110px;
        border-radius: 12px;
        object-fit: cover;
        background: #f2ece4;
      }

      .dish-image > span {
        display: grid;
        place-items: center;
        font-size: 40px;
      }

      .dish-fields {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .options label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
      }

      .options input {
        width: auto;
      }

      .dish-actions {
        justify-content: flex-end;
        border-top: 1px solid #eee7dd;
        padding-top: 12px;
      }

      .save-bar {
        position: fixed;
        bottom: 18px;
        left: 50%;
        transform: translateX(-50%);
        width: min(1120px, calc(100% - 32px));
        background: #261f19;
        color: white;
        border-radius: 16px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.22);
        z-index: 50;
      }

      .admin-login {
        max-width: 420px;
        margin: 70px auto;
        background: white;
        padding: 30px;
        border-radius: 20px;
        border: 1px solid #e1d8cc;
        box-shadow: 0 15px 50px rgba(50, 30, 10, 0.08);
      }

      .admin-login h1 {
        margin-bottom: 6px;
      }

      .admin-login p {
        color: #746b62;
      }

      .admin-login a {
        display: block;
        margin-top: 18px;
        text-align: center;
        color: #8a5500;
      }

      .admin-logo {
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #b36b00;
        color: white;
        font-weight: 900;
        font-size: 26px;
      }

      @media (max-width: 800px) {
        .admin-header,
        .section-head,
        .category-item {
          flex-direction: column;
        }

        .admin-grid,
        .image-grid,
        .toolbar,
        .dish-card,
        .dish-fields,
        .category-form {
          grid-template-columns: 1fr;
        }

        .dish-image {
          grid-row: auto;
        }

        .dish-image img,
        .dish-image > span {
          width: 100%;
          height: 190px;
        }

        .admin-grid .wide,
        .dish-fields .wide {
          grid-column: auto;
        }

        .admin-actions {
          width: 100%;
        }

        .save-bar {
          align-items: stretch;
          flex-direction: column;
        }
      }
    `}</style>
  );
}