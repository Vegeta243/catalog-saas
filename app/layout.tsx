import type { Metadata, Viewport } from "next";
import "./globals.css";
import CookieBanner from "@/components/cookie-banner";
import { PushNotificationSetup } from "@/components/push-notifications";
import { validateEnv } from "@/lib/env-validation";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Validate required environment variables at server startup
validateEnv();

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ecompilotelite.com"),
  title: {
    default: "EcomPilot — Optimisez votre catalogue Shopify avec l'IA",
    template: "%s | EcomPilot",
  },
  description:
    "EcomPilot est le copilote IA pour Shopify : générez des descriptions, optimisez votre SEO, éditez en masse et automatisez votre catalogue. 30 actions gratuites, sans carte bancaire.",
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
    description: "30 actions gratuites. Descriptions IA, édition en masse, automatisations. Sans carte bancaire.",
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EcomPilot Elite",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EcomPilot Elite" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0f172a" />
        {/* Dark mode init — must run before paint to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('app-theme');if(t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})()` }} />
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
                description: "30 actions gratuites sans carte bancaire",
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
        <PushNotificationSetup />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
