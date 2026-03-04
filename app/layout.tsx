import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/cookie-banner";

export const metadata: Metadata = {
  title: "EcomPilot — Gestion de catalogue Shopify",
  description: "Gérez et modifiez vos produits Shopify en masse avec EcomPilot",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
