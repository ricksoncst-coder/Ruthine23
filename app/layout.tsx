import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.costasindiancuisine.de"),

  title: "Costa's Indian Cuisine | Indisches Restaurant in Sittensen",

  description:
    "Authentische indische Küche in Sittensen. Frisch zubereitete Currys, Tandoori-Gerichte und indische Spezialitäten. Online reservieren oder bequem per WhatsApp bestellen.",

  keywords: [
    "Indisches Restaurant Sittensen",
    "Indisch essen Sittensen",
    "Indian Restaurant Sittensen",
    "Indische Küche Sittensen",
    "Costa's Indian Cuisine",
    "Indisches Essen Sittensen",
    "Tandoori Sittensen",
    "Curry Sittensen",
    "Takeaway Sittensen",
  ],

  authors: [{ name: "Costa's Indian Cuisine" }],

  alternates: {
    canonical: "https://www.costasindiancuisine.de/",
  },

  openGraph: {
    title: "Costa's Indian Cuisine | Indisches Restaurant in Sittensen",
    description:
      "Authentische indische Küche in Sittensen – Currys, Tandoori-Gerichte und indische Spezialitäten.",
    url: "https://www.costasindiancuisine.de/",
    siteName: "Costa's Indian Cuisine",
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: "/logo-whatsapp.png",
        width: 1200,
        height: 1200,
        alt: "Costa's Indian Cuisine – Indisches Restaurant in Sittensen",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Costa's Indian Cuisine | Sittensen",
    description: "Authentische indische Küche in Sittensen.",
    images: ["/logo-whatsapp.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Costa's Indian Cuisine",
  url: "https://www.costasindiancuisine.de/",
  telephone: "+49 4282 5089698",
  image: "https://www.costasindiancuisine.de/logo-whatsapp.png",
  priceRange: "€€",
  servesCuisine: ["Indische Küche", "Indian Cuisine"],

  address: {
    "@type": "PostalAddress",
    streetAddress: "Am Markt 12",
    postalCode: "27419",
    addressLocality: "Sittensen",
    addressCountry: "DE",
  },

  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "17:00",
      closes: "22:00",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(restaurantJsonLd),
          }}
        />
        {children}
      </body>
    </html>
  );
}
