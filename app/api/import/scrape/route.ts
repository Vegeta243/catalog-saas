import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

/* --- CJ demo products for when scraping fails --- */
const CJ_DEMO_PRODUCTS = [
  {
    title: "Montre Connectée Sport Étanche IP68 — Suivi Activité & Cardiaque",
    description: `<p>Montre connectée haute performance conçue pour les sportifs. Étanche IP68, résiste à la pluie et la transpiration.</p><ul><li><strong>Suivi santé avancé</strong> — fréquence cardiaque, SpO2, sommeil</li><li><strong>GPS intégré</strong> — traçage précis de vos parcours</li><li><strong>Autonomie 7 jours</strong> — recharge magnétique rapide</li><li><strong>Compatible iOS &amp; Android</strong> — notifications intelligentes</li><li><strong>Design premium</strong> — verre trempé, bracelet silicone respirant</li></ul>`,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
    supplierPrice: 8.50,
  },
  {
    title: "Écouteurs Sans Fil TWS Bluetooth 5.3 — Réduction de Bruit Active",
    description: `<p>Écouteurs intra-auriculaires avec ANC (Active Noise Cancellation). Immersion sonore totale, qualité Hi-Fi cristalline.</p><ul><li><strong>Bluetooth 5.3</strong> — connexion stable, latence ultra-faible</li><li><strong>ANC active</strong> — annulation du bruit jusqu'à -35dB</li><li><strong>30h d'autonomie</strong> — 8h + boîtier de charge portable</li><li><strong>Micro double</strong> — appels cristallins en environnement bruyant</li><li><strong>IPX5</strong> — résistant à la transpiration</li></ul>`,
    imageUrl: "https://images.unsplash.com/photo-1572917840629-35c75cf7cf4a?w=800&q=80",
    supplierPrice: 5.20,
  },
  {
    title: "Lampe LED Solaire Extérieure 120 LEDs — Détecteur Mouvement IP65",
    description: `<p>Éclairage solaire intelligent pour terrasse, jardin, façade. Installation sans câble, fonctionnement autonome.</p><ul><li><strong>120 LEDs 1200 lumens</strong> — éclairage blanc froid puissant</li><li><strong>Détecteur PIR</strong> — activation automatique jusqu'à 8 mètres</li><li><strong>Panneau solaire intégré</strong> — charge complète en 6-8h</li><li><strong>Étanche IP65</strong> — résiste aux intempéries, gel, chaleur</li><li><strong>Installation facile</strong> — fixation murale incluse</li></ul>`,
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    supplierPrice: 4.80,
  },
];

function isCjUrl(url: string): boolean {
  return url.includes("cjdropshipping.com") || url.includes("cjsource.com");
}

function isAliexpressUrl(url: string): boolean {
  return url.includes("aliexpress.com") || url.includes("aliexpress.ru");
}

function resolveImageUrl(src: string, baseUrl: string): string {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("//")) return "https:" + src;
  if (src.startsWith("/")) {
    try {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${src}`;
    } catch { return src; }
  }
  return src;
}

function cleanPrice(text: string): number {
  const match = text.replace(/[^\d.,]/g, "").match(/[\d]+[.,]?[\d]*/);
  if (!match) return 0;
  return parseFloat(match[0].replace(",", ".")) || 0;
}

function extractJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  try {
    const scripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i++) {
      const content = $(scripts[i]).html();
      if (!content) continue;
      try {
        const data = JSON.parse(content);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] === "Product" || item.name) return item;
        }
      } catch { /* skip invalid JSON */ }
    }
  } catch { /* ignore */ }
  return null;
}

export async function POST(req: Request) {
  try {
    const { url, margin } = await req.json();
    const multiplier = parseFloat(margin) || 2.5;

    if (!url) {
      return NextResponse.json({ error: "URL manquante." }, { status: 400 });
    }

    // --- CJ Dropshipping ---
    if (isCjUrl(url)) {
      const result = await scrapePage(url, multiplier);
      if (result && result.title && result.title !== "Produit importé") {
        return NextResponse.json({ success: true, preview: result });
      }
      // Demo fallback — CJ pages are JS-rendered so often scraping fails
      const demo = CJ_DEMO_PRODUCTS[Math.floor(Math.random() * CJ_DEMO_PRODUCTS.length)];
      return NextResponse.json({
        success: true,
        demo: true,
        preview: {
          title: demo.title,
          description: demo.description,
          imageUrl: demo.imageUrl,
          supplierPrice: demo.supplierPrice,
          sellingPrice: (demo.supplierPrice * multiplier).toFixed(2),
          margin: multiplier,
        },
      });
    }

    // --- General scraping ---
    const preview = await scrapePage(url, multiplier);
    return NextResponse.json({ success: true, preview });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function scrapePage(url: string, multiplier: number) {
  const pageRes = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`);
  const html = await pageRes.text();
  const $ = cheerio.load(html);

  // Try JSON-LD first (most reliable structured data)
  const jsonLd = extractJsonLd($);
  let title = "";
  let description = "";
  let imageUrl = "";
  let supplierPrice = 0;

  if (jsonLd) {
    title = (jsonLd.name as string) || "";
    description = (jsonLd.description as string) || "";
    const img = jsonLd.image;
    if (typeof img === "string") imageUrl = img;
    else if (Array.isArray(img) && img.length > 0) imageUrl = typeof img[0] === "string" ? img[0] : ((img[0] as Record<string, string>).url || "");
    else if (img && typeof img === "object") imageUrl = (img as Record<string, string>).url || "";
    const offers = jsonLd.offers;
    if (offers) {
      const o = Array.isArray(offers) ? offers[0] : offers;
      supplierPrice = parseFloat(String((o as Record<string, unknown>).price)) || 0;
    }
  }

  // Fallback to meta tags & DOM
  if (!title) {
    title = $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="title"]').attr("content") ||
      $("title").text().trim() ||
      "Produit importé";
  }
  if (!description) {
    description = $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $(".product-description, .product-detail, [itemprop='description']").first().text().trim() ||
      "";
  }
  if (!imageUrl) {
    imageUrl = $('meta[property="og:image"]').attr("content") ||
      $('meta[property="og:image:secure_url"]').attr("content") ||
      $("img.product-image, img.main-image, img[data-role='image'], .product-main-image img, #main-image img").first().attr("src") ||
      $("img[src*='product'], img[src*='item']").first().attr("src") ||
      $("img").not("[src*='logo'], [src*='icon'], [src*='avatar'], [src*='banner']").first().attr("src") ||
      "";
  }
  imageUrl = resolveImageUrl(imageUrl, url);

  if (supplierPrice === 0) {
    const priceSelectors = isAliexpressUrl(url)
      ? [".product-price-value", '[class*="price_current"]', '[class*="Price"]', ".snow-price_SnowPrice__mainS__18x8np"]
      : [".product-price", ".price", "[data-price]", ".uniform-banner-box-price", ".product-sales-price", "[itemprop='price']", ".current-price", ".sell-price"];

    for (const sel of priceSelectors) {
      const pText = $(sel).first().text().trim();
      if (pText) {
        const p = cleanPrice(pText);
        if (p > 0) { supplierPrice = p; break; }
      }
    }
    if (supplierPrice === 0) {
      const metaPrice = $('meta[property="product:price:amount"]').attr("content") || $('meta[itemprop="price"]').attr("content");
      if (metaPrice) supplierPrice = parseFloat(metaPrice) || 0;
    }
    // Try inline scripts for embedded price data
    if (supplierPrice === 0) {
      $("script:not([src])").each((_, el) => {
        const c = $(el).html() || "";
        const m = c.match(/"(?:sellPrice|price|currentPrice)"\s*:\s*([\d.]+)/);
        if (m) { supplierPrice = parseFloat(m[1]) || 0; return false; }
      });
    }
  }

  // Clean title
  title = title.replace(/\s*[|–-]\s*(AliExpress|Amazon|Cdiscount|CJDropshipping|eBay|AliExpress\.com).*$/i, "").trim();

  return {
    title: title.substring(0, 200),
    description: description.substring(0, 3000),
    imageUrl,
    supplierPrice,
    sellingPrice: (supplierPrice * multiplier).toFixed(2),
    margin: multiplier,
  };
}
