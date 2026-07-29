import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Costa's Indian Cuisine | Sittensen",
  description:
    "Authentische indische Küche in Sittensen – frisch gekocht, aromatisch gewürzt und mit Liebe serviert.",
  keywords: ["indisches Restaurant", "Sittensen", "indische Küche", "Costa's Indian Cuisine"],
  openGraph: {
    title: "Costa's Indian Cuisine",
    description: "Authentische indische Küche im Herzen von Sittensen.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
