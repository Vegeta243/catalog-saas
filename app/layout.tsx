import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/cookie-banner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ecompilotelite.com"),
  title: {
    default: "EcomPilot — Optimisez votre catalogue Shopify avec l'IA",
    template: "%s | EcomPilot",
  },
  description:
    "EcomPilot est le copilote IA pour Shopify : générez des descriptions, optimisez votre SEO, éditez en masse et automatisez votre catalogue. 50 actions gratuites, sans carte bancaire.",
  keywords: [
    "Shopify",
    "catalogue Shopify",
    "optimisation SEO",
    "descriptions IA",
    "gestion catalogue",
    "EcomPilot",
    "dropshipping",
    "import AliExpress",
    "automatisation boutique",
  ],
  authors: [{ name: "EcomPilot", url: "https://www.ecompilotelite.com" }],
  creator: "EcomPilot",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://www.ecompilotelite.com",
    siteName: "EcomPilot",
    title: "EcomPilot — Optimisez votre catalogue Shopify avec l'IA",
    description:
      "Générez des descriptions IA, éditez en masse, importez depuis AliExpress & CJ. Le copilote de votre boutique Shopify.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EcomPilot — Copilote IA pour Shopify",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EcomPilot — Copilote IA pour Shopify",
    description: "50 actions gratuites. Descriptions IA, édition en masse, automatisations. Sans carte bancaire.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://www.ecompilotelite.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "EcomPilot",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: "https://www.ecompilotelite.com",
              description:
                "Le copilote IA pour optimiser votre catalogue Shopify. Descriptions IA, édition en masse, import AliExpress, automatisations.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "EUR",
                description: "50 actions gratuites sans carte bancaire",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "127",
              },
            }),
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
