import { createClient } from "@supabase/supabase-js";
import { Dish, RestaurantSettings } from "./data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase-Umgebungsvariablen fehlen.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function settingsFromRow(row: Record<string, unknown>): RestaurantSettings {
  return {
    name: String(row.name ?? ""),
    shortName: String(row.short_name ?? ""),
    slogan: String(row.slogan ?? ""),
    heroTitle: String(row.hero_title ?? ""),
    heroImage: String(row.hero_image ?? ""),
    logoImage: String(row.logo_image ?? ""),
    phone: String(row.phone ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    email: String(row.email ?? ""),
    street: String(row.street ?? ""),
    city: String(row.city ?? ""),
    openingHours: String(row.opening_hours ?? ""),
    primaryColor: String(row.primary_color ?? "#d97706"),
  };
}

export function settingsToRow(settings: RestaurantSettings) {
  return {
    id: 1,
    name: settings.name,
    short_name: settings.shortName,
    slogan: settings.slogan,
    hero_title: settings.heroTitle,
    hero_image: settings.heroImage,
    logo_image: settings.logoImage,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    email: settings.email,
    street: settings.street,
    city: settings.city,
    opening_hours: settings.openingHours,
    primary_color: settings.primaryColor,
  };
}

export function dishFromRow(row: Record<string, unknown>): Dish {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    category: String(row.category ?? ""),
    description: String(row.description ?? ""),
    price: Number(row.price ?? 0),
    icon: String(row.icon ?? "🍽️"),
    image: String(row.image ?? ""),
    vegetarian: Boolean(row.vegetarian),
    vegan: Boolean(row.vegan),
    spicy: Boolean(row.spicy),
    active: row.active !== false,
  };
}

export function dishToRow(dish: Dish) {
  return {
    id: dish.id,
    name: dish.name,
    category: dish.category,
    description: dish.description,
    price: dish.price,
    icon: dish.icon || "🍽️",
    image: dish.image || "",
    vegetarian: dish.vegetarian ?? false,
    vegan: dish.vegan ?? false,
    spicy: dish.spicy ?? false,
    active: dish.active !== false,
  };
}
