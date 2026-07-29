export type Dish = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  icon: string;
  image?: string;
  vegetarian?: boolean;
  vegan?: boolean;
  spicy?: boolean;
  active?: boolean;
};

export type RestaurantSettings = {
  name: string;
  shortName: string;
  slogan: string;
  heroTitle: string;
  heroImage: string;
  logoImage: string;
  phone: string;
  whatsapp: string;
  email: string;
  street: string;
  city: string;
  openingHours: string;
  primaryColor: string;
};

export const defaultSettings: RestaurantSettings = {
  name: "Costa's Indian Cuisine",
  shortName: "Costa's",
  slogan: "Authentische indische Küche im Herzen von Sittensen",
  heroTitle: "Authentischer indischer Genuss",
  heroImage: "",
  logoImage: "",
  phone: "04282 5089698",
  whatsapp: "4942825089698",
  email: "ricksoncosta@gmx.de",
  street: "Am Markt 12",
  city: "27419 Sittensen",
  openingHours: "Dienstag–Sonntag: 17:00–22:00 Uhr · Montag Ruhetag",
  primaryColor: "#d97706",
};

export const defaultDishes: Dish[] = [
  { id: 1, name: "Chicken Pakoras", category: "Vorspeisen", description: "6 Stück Hähnchenfilet in Kichererbsenteig knusprig frittiert. Mit drei Chutneys.", price: 6.9, icon: "🍗", active: true },
  { id: 2, name: "Onion Bhaji", category: "Vorspeisen", description: "5 Stück Zwiebelbällchen in Kichererbsenmehl knusprig frittiert. Mit drei Chutneys.", price: 6.9, icon: "🧅", vegetarian: true, active: true },
  { id: 3, name: "Paneer Pakoras", category: "Vorspeisen", description: "5 Stück frischer indischer Käse in Kichererbsenmehl frittiert. Mit drei Chutneys.", price: 7.9, icon: "🧀", vegetarian: true, active: true },
  { id: 4, name: "Vegetable Samosa", category: "Vorspeisen", description: "2 Teigtaschen gefüllt mit Kartoffeln, Erbsen, Cashew und indischen Gewürzen.", price: 6.9, icon: "🥟", vegetarian: true, active: true },
  { id: 5, name: "Papadams", category: "Vorspeisen", description: "3 Stück knuspriges Brot aus Bohnenmehl.", price: 4.9, icon: "🫓", vegetarian: true, vegan: true, active: true },
  { id: 6, name: "Gemischter Vorspeisenteller", category: "Vorspeisen", description: "2 Onion Bhaji, 2 Aubergine, 2 Blumenkohl, 2 Kartoffeln, 2 Paneer und 2 Chicken Pakoras.", price: 13.9, icon: "🍽️", active: true },

  { id: 10, name: "Linsensuppe", category: "Suppen & Salate", description: "Aromatische indische Linsensuppe.", price: 5.9, icon: "🍲", vegetarian: true, active: true },
  { id: 11, name: "Hühnersuppe", category: "Suppen & Salate", description: "Wärmende Suppe mit Hähnchen.", price: 5.0, icon: "🍲", active: true },
  { id: 12, name: "Gemischter Salat", category: "Suppen & Salate", description: "Knackiger Blattsalat, Tomaten, Gurken, Karotten und Zwiebeln.", price: 5.9, icon: "🥗", vegetarian: true, vegan: true, active: true },
  { id: 13, name: "Indischer Salat", category: "Suppen & Salate", description: "Tomaten, Gurken, Karotten, Zwiebeln und grüne Chili.", price: 5.9, icon: "🥗", vegetarian: true, vegan: true, spicy: true, active: true },
  { id: 14, name: "Paneer Mango Salat", category: "Suppen & Salate", description: "Indischer Käse und Mango auf gemischtem Salat.", price: 11.9, icon: "🥭", vegetarian: true, active: true },

  { id: 20, name: "Dal Tarka", category: "Vegane Gerichte", description: "Gelbe Linsen nach indischer Art.", price: 14.9, icon: "🫘", vegetarian: true, vegan: true, active: true },
  { id: 21, name: "Aloo Gobi", category: "Vegane Gerichte", description: "Kartoffeln und Blumenkohl in Currysauce.", price: 14.9, icon: "🥔", vegetarian: true, vegan: true, active: true },
  { id: 22, name: "Chana Masala", category: "Vegane Gerichte", description: "Kichererbsen in Masala-Sauce.", price: 14.9, icon: "🫘", vegetarian: true, vegan: true, active: true },
  { id: 23, name: "Sabzi Curry", category: "Vegane Gerichte", description: "Verschiedenes Gemüse in Currysauce.", price: 14.9, icon: "🥦", vegetarian: true, vegan: true, active: true },
  { id: 24, name: "Bhindi Masala", category: "Vegane Gerichte", description: "Okra in Masala-Sauce.", price: 14.9, icon: "🌿", vegetarian: true, vegan: true, active: true },

  { id: 30, name: "Palak Paneer", category: "Vegetarische Gerichte", description: "Spinat mit hausgemachtem Käse in Currysauce.", price: 14.9, icon: "🥬", vegetarian: true, active: true },
  { id: 31, name: "Butter Paneer Masala", category: "Vegetarische Gerichte", description: "Aromatische Tomaten-Zwiebel-Sauce mit ausgewogenen indischen Gewürzen.", price: 14.9, icon: "🧀", vegetarian: true, active: true },
  { id: 32, name: "Paneer Jalfrezi", category: "Vegetarische Gerichte", description: "Scharfe Currysauce mit indischem Käse, frischer Paprika und Zwiebeln.", price: 14.9, icon: "🌶️", vegetarian: true, spicy: true, active: true },
  { id: 33, name: "Sabzi Korma", category: "Vegetarische Gerichte", description: "Verschiedenes Gemüse in Kokos-Mandel-Currysauce.", price: 14.9, icon: "🥥", vegetarian: true, active: true },
  { id: 34, name: "Dal Makhani", category: "Vegetarische Gerichte", description: "Schwarze Linsen nach indischer Art.", price: 14.9, icon: "🫘", vegetarian: true, active: true },

  { id: 40, name: "Chicken Korma", category: "Hähnchengerichte", description: "Cremig-mild, mit Kokosmilch, Sahne und Mandeln.", price: 15.9, icon: "🍗", active: true },
  { id: 41, name: "Butter Chicken", category: "Hähnchengerichte", description: "Samtig-cremig und mild, auf Basis von Butter, Sahne und Cashews.", price: 15.9, icon: "🍛", active: true },
  { id: 42, name: "Chicken Tikka Masala", category: "Hähnchengerichte", description: "Aromatische Tomaten-Zwiebel-Sauce, ausgewogen gewürzt.", price: 15.9, icon: "🔥", active: true },
  { id: 43, name: "Chicken Jalfrezi", category: "Hähnchengerichte", description: "Kräftig-würzig, mit frischer Paprika und Zwiebeln, scharf.", price: 15.9, icon: "🌶️", spicy: true, active: true },
  { id: 44, name: "Chicken Vindaloo", category: "Hähnchengerichte", description: "Sehr pikant, würzig-säuerlich und feurig scharf.", price: 15.9, icon: "🔥", spicy: true, active: true },
  { id: 45, name: "Chicken Curry", category: "Hähnchengerichte", description: "Aromatische, mild gewürzte Klassik-Sauce.", price: 15.9, icon: "🍛", active: true },
  { id: 46, name: "Chicken Palak", category: "Hähnchengerichte", description: "Cremige, fein pürierte Sauce aus frischem Blattspinat.", price: 15.9, icon: "🥬", active: true },
  { id: 47, name: "Mango Chicken", category: "Hähnchengerichte", description: "Cremige Mango-Currysauce.", price: 15.9, icon: "🥭", active: true },

  { id: 50, name: "Lamm Korma", category: "Lammgerichte", description: "Cremig-mild, mit Kokosmilch, Sahne und Mandeln.", price: 16.9, icon: "🐑", active: true },
  { id: 51, name: "Lamm Butter Masala", category: "Lammgerichte", description: "Tomaten-Zwiebel-Sauce, aromatisch ausgewogen.", price: 17.9, icon: "🥘", active: true },
  { id: 52, name: "Lamm Palak", category: "Lammgerichte", description: "Cremige, fein pürierte Sauce aus frischem Blattspinat.", price: 17.9, icon: "🥬", active: true },
  { id: 53, name: "Lamm Rogan Josh", category: "Lammgerichte", description: "Würzige aromatische Sauce nach nordindischer Art.", price: 17.9, icon: "🥘", active: true },
  { id: 54, name: "Lamm Jalfrezi", category: "Lammgerichte", description: "Kräftig-würzig, mit frischer Paprika und Zwiebeln, scharf.", price: 17.9, icon: "🌶️", spicy: true, active: true },
  { id: 55, name: "Lamm Bhuna", category: "Lammgerichte", description: "Dick eingekochte Masala aus Zwiebeln, Tomaten, Knoblauch und Ingwer.", price: 17.9, icon: "🐑", active: true },

  { id: 60, name: "Ente Korma", category: "Entengerichte", description: "Knusprige Ente in milder Mandel-Kokos-Sauce.", price: 17.9, icon: "🦆", active: true },
  { id: 61, name: "Butter Ente", category: "Entengerichte", description: "Knusprige Ente in cremiger Butter-Tomaten-Sauce.", price: 17.9, icon: "🦆", active: true },
  { id: 62, name: "Ente Vindaloo", category: "Entengerichte", description: "Knusprige Ente in scharfer Vindaloo-Currysauce.", price: 17.9, icon: "🔥", spicy: true, active: true },
  { id: 63, name: "Ente Mango", category: "Entengerichte", description: "Knusprige Ente in fruchtiger Mango-Currysauce.", price: 17.9, icon: "🥭", active: true },

  { id: 70, name: "Jhinga Butter Masala", category: "Garnelengerichte", description: "Garnelen in cremiger Butter-Tomaten-Sauce.", price: 18.9, icon: "🍤", active: true },
  { id: 71, name: "Jhinga Korma", category: "Garnelengerichte", description: "Garnelen in milder Mandel-Kokos-Sauce.", price: 18.9, icon: "🍤", active: true },
  { id: 72, name: "Jhinga Jalfrezi", category: "Garnelengerichte", description: "Garnelen mit Paprika und Zwiebeln in würziger Currysauce.", price: 18.9, icon: "🌶️", spicy: true, active: true },
  { id: 73, name: "Jhinga Curry", category: "Garnelengerichte", description: "Garnelen in aromatischer Currysauce.", price: 18.9, icon: "🍤", active: true },

  { id: 80, name: "Chicken Biryani", category: "Biryani Gerichte", description: "Basmatireis mit Hähnchen, Safran und indischen Gewürzen.", price: 17.9, icon: "🍚", active: true },
  { id: 81, name: "Lamm Biryani", category: "Biryani Gerichte", description: "Basmatireis mit zartem Lammfleisch und Gewürzen.", price: 18.9, icon: "🍚", active: true },
  { id: 82, name: "Jhinga Biryani", category: "Biryani Gerichte", description: "Basmatireis mit Garnelen, Safran und Kräutern.", price: 19.9, icon: "🍤", active: true },
  { id: 83, name: "Vegetable Biryani", category: "Biryani Gerichte", description: "Basmatireis mit frischem Gemüse und aromatischen Gewürzen.", price: 17.9, icon: "🥦", vegetarian: true, active: true },

  { id: 90, name: "Chicken Tikka", category: "Tandoori Gerichte", description: "Zarte Hähnchenfilets aus dem Tandoor-Ofen.", price: 17.9, icon: "🔥", active: true },
  { id: 91, name: "Pahari Chicken Tikka", category: "Tandoori Gerichte", description: "Hähnchen in frischer Kräuter-Marinade.", price: 17.9, icon: "🌿", active: true },
  { id: 92, name: "Chilli Chicken Tikka", category: "Tandoori Gerichte", description: "Hähnchenfilets in würziger Chilli-Marinade.", price: 17.9, icon: "🌶️", spicy: true, active: true },
  { id: 93, name: "Chicken Malai Tikka", category: "Tandoori Gerichte", description: "Besonders zart in cremiger Sahne-Marinade.", price: 17.9, icon: "🍗", active: true },
  { id: 94, name: "Seekh Kebab", category: "Tandoori Gerichte", description: "Würzige Lammhackspieße aus dem Tandoor.", price: 19.9, icon: "🍢", active: true },
  { id: 95, name: "Tandoori King Prawns", category: "Tandoori Gerichte", description: "Königsgarnelen in Joghurt-Knoblauch-Marinade.", price: 21.9, icon: "🍤", active: true },
  { id: 96, name: "Mix Grill", category: "Tandoori Gerichte", description: "Auswahl verschiedener Tandoori-Spezialitäten.", price: 25.9, icon: "🔥", active: true },

  { id: 100, name: "Naan", category: "Beilagen", description: "Frisch gebackenes indisches Fladenbrot.", price: 3.0, icon: "🫓", vegetarian: true, active: true },
  { id: 101, name: "Garlic Naan", category: "Beilagen", description: "Fladenbrot mit Knoblauch.", price: 3.2, icon: "🧄", vegetarian: true, active: true },
  { id: 102, name: "Paneer Naan", category: "Beilagen", description: "Fladenbrot mit Paneer-Füllung.", price: 4.9, icon: "🧀", vegetarian: true, active: true },
  { id: 103, name: "Käse Naan", category: "Beilagen", description: "Fladenbrot mit Käsefüllung.", price: 5.5, icon: "🧀", vegetarian: true, active: true },
  { id: 104, name: "Aloo Naan", category: "Beilagen", description: "Fladenbrot mit Kartoffelfüllung.", price: 4.9, icon: "🥔", vegetarian: true, active: true },
  { id: 105, name: "Extra Portion Reis", category: "Beilagen", description: "Zusätzliche Portion Basmatireis.", price: 3.5, icon: "🍚", vegetarian: true, vegan: true, active: true },
  { id: 106, name: "Raita", category: "Beilagen", description: "Erfrischender Joghurt-Dip.", price: 3.5, icon: "🥣", vegetarian: true, active: true },
  { id: 107, name: "Mango Chutney", category: "Beilagen", description: "Fruchtiges Mango-Chutney.", price: 1.0, icon: "🥭", vegetarian: true, active: true },
  { id: 108, name: "Mix Pickle", category: "Beilagen", description: "Würzig eingelegtes Gemüse.", price: 1.5, icon: "🥒", vegetarian: true, vegan: true, spicy: true, active: true },
  { id: 109, name: "Minz Chutney", category: "Beilagen", description: "Frisches Minz-Chutney.", price: 1.0, icon: "🌿", vegetarian: true, active: true },

  { id: 120, name: "Kulfi", category: "Desserts", description: "Traditionelles indisches Eis.", price: 4.9, icon: "🍨", vegetarian: true, active: true },
  { id: 121, name: "Mango Cream", category: "Desserts", description: "Cremiges Mango-Dessert.", price: 4.9, icon: "🥭", vegetarian: true, active: true },
  { id: 122, name: "Gulab Jamun", category: "Desserts", description: "Süße indische Milchteigbällchen in Sirup.", price: 4.9, icon: "🍮", vegetarian: true, active: true },
];

export const DISHES_KEY = "costas_dishes_v3";
export const SETTINGS_KEY = "costas_settings_v3";
