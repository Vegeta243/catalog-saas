import type { Metadata, Viewport } from "next";
import "./globals.css";
import CookieBanner from "@/components/cookie-banner";
import { PushNotificationSetup } from "@/components/push-notifications";
import { TrackingPixels } from "@/components/tracking-pixels";
import { validateEnv } from "@/lib/env-validation";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Validate required environment variables at server startup
validateEnv();

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ecompilotelite.com"),
  title: {
    default: "EcomPilot Elite — IA pour boutiques Shopify",
    template: "%s — EcomPilot Elite",
  },
  description:
    "Optimisez votre boutique Shopify avec l'IA. Générez des fiches produits SEO, importez depuis AliExpress, éditez vos prix en masse. Essai gratuit sans CB.",
  keywords: [
    "shopify optimisation",
    "ia ecommerce",
    "seo shopify",
    "import aliexpress",
    "dropshipping france",
    "fiches produits ia",
    "optimisation catalogue shopify",
    "ecompilot",
    "bulk edit shopify",
  ],
  authors: [{ name: "EcomPilot Elite" }],
  creator: "EcomPilot Elite",
  publisher: "EcomPilot Elite",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://www.ecompilotelite.com",
    siteName: "EcomPilot Elite",
    title: "EcomPilot Elite — L'IA qui optimise votre boutique Shopify",
    description:
      "Générez des fiches produits pro en 1 clic, importez depuis AliExpress, éditez 500 prix en masse. 100 actions gratuites sans CB.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "EcomPilot Elite — Optimisation Shopify par IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EcomPilot Elite — L'IA pour Shopify",
    description: "Fiches produits SEO en 1 clic. Import AliExpress. Édition en masse.",
    images: ["/api/og"],
    creator: "@ecompilotelite",
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
    languages: {
      "fr-FR": "https://www.ecompilotelite.com",
    },
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
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://api.supabase.co" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EcomPilot Elite" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0f172a" />
        {/* Dark mode init — force dark always; only remove if user explicitly chose light */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('app-theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})()` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "EcomPilot Elite",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Android, iOS",
              url: "https://www.ecompilotelite.com",
              description:
                "Optimisez votre boutique Shopify avec l'IA. Fiches produits SEO, import AliExpress, édition prix en masse.",
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "EUR",
                lowPrice: "0",
                highPrice: "129",
                offerCount: 4,
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                reviewCount: "47",
              },
              featureList: [
                "Génération de fiches produits par IA",
                "Import depuis AliExpress",
                "Édition de prix en masse",
                "Analyse SEO automatique",
                "Analyse de la concurrence",
              ],
            }),
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <CookieBanner />
        <PushNotificationSetup />
        <TrackingPixels />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
