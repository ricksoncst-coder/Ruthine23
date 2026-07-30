import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Costa's Indian Cuisine | Indisches Restaurant in Sittensen",
  description:
    "Authentische indische Küche in Sittensen. Bestelle bequem per WhatsApp oder reserviere deinen Tisch online.",
  keywords: [
    "Indisches Restaurant",
    "Sittensen",
    "Indian Food",
    "Takeaway",
    "Lieferdienst",
    "WhatsApp Bestellung",
    "Costa's Indian Cuisine",
  ],
  authors: [{ name: "Costa's Indian Cuisine" }],
  openGraph: {
    title: "Costa's Indian Cuisine",
    description:
      "Authentische indische Küche in Sittensen.",
    type: "website",
    locale: "de_DE",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}