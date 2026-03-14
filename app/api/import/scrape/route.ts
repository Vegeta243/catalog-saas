import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

/**
 * Extracts a balanced JSON object starting from the first '{' found after
 * searchStr in html. Handles nested braces and strings correctly.
 */
function extractBalancedJson(html: string, searchStr: string): Record<string, unknown> | null {
  const si = html.indexOf(searchStr);
  if (si === -1) return null;
  const braceStart = html.indexOf('{', si + searchStr.length);
  if (braceStart === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  // Limit scan to 3 MB to avoid hanging on huge pages
  const limit = Math.min(html.length, braceStart + 3_000_000);
  for (let i = braceStart; i < limit; i++) {
    const c = html[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(braceStart, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

/* --- CJ demo products for when scraping fails --- */
const CJ_DEMO_PRODUCTS = [
  {
    title: "Montre Connectée Sport Étanche IP68  Suivi Activité & Cardiaque",
    description: `<p>Montre connectée haute performance conçue pour les sportifs. Étanche IP68, résiste à la pluie et la transpiration.</p><ul><li><strong>Suivi santé avancé</strong>  fréquence cardiaque, SpO2, sommeil</li><li><strong>GPS intégré</strong>  traçage précis de vos parcours</li><li><strong>Autonomie 7 jours</strong>  recharge magnétique rapide</li><li><strong>Compatible iOS &amp; Android</strong>  notifications intelligentes</li><li><strong>Design premium</strong>  verre trempé, bracelet silicone respirant</li></ul>`,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
    supplierPrice: 8.50,
  },
  {
    title: "Écouteurs Sans Fil TWS Bluetooth 5.3  Réduction de Bruit Active",
    description: `<p>Écouteurs intra-auriculaires avec ANC (Active Noise Cancellation). Immersion sonore totale, qualité Hi-Fi cristalline.</p><ul><li><strong>Bluetooth 5.3</strong>  connexion stable, latence ultra-faible</li><li><strong>ANC active</strong>  annulation du bruit jusqu'à -35dB</li><li><strong>30h d'autonomie</strong>  8h + boîtier de charge portable</li><li><strong>Micro double</strong>  appels cristallins en environnement bruyant</li><li><strong>IPX5</strong>  résistant à la transpiration</li></ul>`,
    imageUrl: "https://images.unsplash.com/photo-1572917840629-35c75cf7cf4a?w=800&q=80",
    supplierPrice: 5.20,
  },
  {
    title: "Lampe LED Solaire Extérieure 120 LEDs  Détecteur Mouvement IP65",
    description: `<p>Éclairage solaire intelligent pour terrasse, jardin, façade. Installation sans câble, fonctionnement autonome.</p><ul><li><strong>120 LEDs 1200 lumens</strong>  éclairage blanc froid puissant</li><li><strong>Détecteur PIR</strong>  activation automatique jusqu'à 8 mètres</li><li><strong>Panneau solaire intégré</strong>  charge complète en 6-8h</li><li><strong>Étanche IP65</strong>  résiste aux intempéries, gel, chaleur</li><li><strong>Installation facile</strong>  fixation murale incluse</li></ul>`,
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

/**
 * Dedicated AliExpress scraper — handles both the modern Next.js frontend
 * (fr.aliexpress.com uses __NEXT_DATA__) and the legacy window.runParams format.
 *
 * Extraction order:
 *  1. __NEXT_DATA__ script tag  (modern AliExpress, ~2024+)
 *  2. window.runParams balanced-JSON  (legacy layout)
 *  3. window._dParams balanced-JSON
 *  4. Direct regex on key JSON fields scattered in page scripts
 *  5. Cheerio meta/og tags as last resort
 */
async function scrapeAliExpress(url: string, multiplier: number) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Referer": "https://fr.aliexpress.com/",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Upgrade-Insecure-Requests": "1",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Detect hard blocks early
  if (/captcha|robot|verify.*human|access.*denied|unusual.*traffic|please.*enable.*javascript/i.test(html.slice(0, 8000))) {
    throw new Error("AliExpress a bloqué la requête (CAPTCHA / vérification). Essayez dans quelques instants.");
  }

  let title = "";
  let supplierPrice = 0;
  let imageUrl = "";
  let imageList: string[] = [];

  function toAbsolute(p: string): string {
    if (!p || typeof p !== "string") return "";
    p = p.trim();
    if (p.startsWith("//")) return "https:" + p;
    if (p.startsWith("http")) return p;
    if (p.length > 10) return "https://" + p;
    return "";
  }

  // Navigate a deeply nested object safely
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function dig(obj: any, ...keys: string[]): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return keys.reduce((o: any, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
  }

  // Try to extract title/price/images from any data object using many known paths
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractFromObj(obj: any): { title: string; price: number; images: string[] } {
    const t =
      dig(obj, "titleModule", "subject") ||
      dig(obj, "productInfo", "subject") ||
      dig(obj, "product", "title") ||
      dig(obj, "title") ||
      dig(obj, "name") ||
      dig(obj, "ae_item_base_info_dto", "subject") ||
      "";

    const priceModule = dig(obj, "priceModule") || dig(obj, "price") || {};
    const price =
      dig(priceModule, "minAmount", "value") ||
      dig(priceModule, "minActivityAmount", "value") ||
      dig(priceModule, "currentPrice", "value") ||
      dig(priceModule, "maxAmount", "value") ||
      parseFloat((String(priceModule?.formatedAmount || "")).replace(/[^\d.]/g, "")) ||
      parseFloat((String(dig(obj, "salePrice") || "")).replace(/[^\d.]/g, "")) ||
      parseFloat((String(dig(obj, "originalPrice") || "")).replace(/[^\d.]/g, "")) ||
      0;

    const rawImages: string[] =
      dig(obj, "imageModule", "imagePathList") ||
      dig(obj, "imagePathList") ||
      dig(obj, "product", "images") ||
      dig(obj, "images") ||
      [];

    return {
      title: typeof t === "string" ? t : "",
      price: typeof price === "number" ? price : 0,
      images: Array.isArray(rawImages) ? rawImages.map(toAbsolute).filter(Boolean) : [],
    };
  }

  // ── Strategy 1: __NEXT_DATA__ (modern fr.aliexpress.com / Next.js frontend) ──
  const nextDataMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nd = JSON.parse(nextDataMatch[1]);
      // Multiple known paths in AliExpress Next.js pages
      const candidates = [
        dig(nd, "props", "pageProps", "ssrProductData"),
        dig(nd, "props", "pageProps", "productInfo"),
        dig(nd, "props", "pageProps", "data"),
        dig(nd, "props", "pageProps", "initialData"),
        dig(nd, "props", "pageProps"),
        dig(nd, "props", "initialState", "productDetail"),
        dig(nd, "props", "initialState"),
        nd?.props,
      ];
      for (const c of candidates) {
        if (!c || typeof c !== "object") continue;
        const ext = extractFromObj(c);
        // Also recurse one level deeper if this looks like a wrapper
        const nested = extractFromObj(c?.data || c?.product || c?.detail || {});
        const best = (ext.title || nested.title) ? (ext.title ? ext : nested) : ext;
        if (best.title || best.price || best.images.length > 0) {
          title = title || best.title;
          supplierPrice = supplierPrice || best.price;
          if (imageList.length === 0 && best.images.length > 0) {
            imageList = best.images;
            imageUrl = imageList[0];
          }
          break;
        }
      }
    } catch { /* __NEXT_DATA__ parse failed — continue */ }
  }

  // ── Strategy 2: window.runParams balanced-JSON (legacy AliExpress) ───────
  if (!title && !supplierPrice) {
    const rp = extractBalancedJson(html, "window.runParams");
    if (rp) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = (rp as any)?.data || rp;
      const ext = extractFromObj(d);
      title = title || ext.title;
      supplierPrice = supplierPrice || ext.price;
      if (imageList.length === 0 && ext.images.length > 0) {
        imageList = ext.images;
        imageUrl = imageList[0];
      }
    }
  }

  // ── Strategy 3: window._dParams ──────────────────────────────────────────
  if (!title) {
    const dp = extractBalancedJson(html, "window._dParams") || extractBalancedJson(html, "_dParams");
    if (dp) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = (dp as any)?.data || dp;
      const ext = extractFromObj(d);
      title = title || ext.title;
      supplierPrice = supplierPrice || ext.price;
    }
  }

  // ── Strategy 4: regex on raw HTML script content ──────────────────────────
  if (!title) {
    // "subject":"Product name here"
    const m = html.match(/"subject"\s*:\s*"((?:[^"\\]|\\.){3,200})"/);
    if (m) {
      title = m[1]
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\n/g, " ").replace(/\\r/g, "").replace(/\\t/g, " ").replace(/\\"/g, '"').trim();
    }
  }
  if (imageList.length === 0) {
    // imagePathList JSON array
    const m = html.match(/"imagePathList"\s*:\s*\[([^\]]+)\]/);
    if (m) {
      imageList = m[1].replace(/["\s]/g, "").split(",").filter(Boolean).map(toAbsolute).filter(Boolean);
      imageUrl = imageList[0] || "";
    }
    // Fallback — scan for ae*.alicdn.com CDN URLs directly in page scripts
    if (imageList.length === 0) {
      const hits = [...html.matchAll(/https?:\/\/ae\d+\.alicdn\.com\/kf\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%\-]+?(?=["'\\])/g)]
        .map(m => m[0].split("_")[0] + ".jpg"); // strip size suffix
      if (hits.length > 0) {
        imageList = [...new Set(hits)].slice(0, 10);
        imageUrl = imageList[0];
      }
    }
  }
  if (supplierPrice === 0) {
    const patterns = [
      /"minAmount"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/,
      /"minActivityAmount"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/,
      /"currentPrice"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/,
      /"salePrice"\s*:\s*"([\d.]+)"/,
      /"originalPrice"\s*:\s*"([\d.]+)"/,
      /"prices"\s*:\s*\{"min"\s*:\s*"([\d.]+)"/,
    ];
    for (const pat of patterns) {
      const m = html.match(pat);
      if (m) { supplierPrice = parseFloat(m[1]) || 0; if (supplierPrice) break; }
    }
  }

  // ── Strategy 5: cheerio meta / og tags ───────────────────────────────────
  if (!title || !imageUrl || supplierPrice === 0) {
    const $ = cheerio.load(html);
    if (!title) {
      title =
        $("meta[property='og:title']").attr("content") ||
        $("meta[name='title']").attr("content") ||
        $("h1[data-pl='product-title']").text().trim() ||
        $("[class*='title--']").first().text().trim() ||
        $("h1").first().text().trim() ||
        "";
    }
    if (!imageUrl) {
      imageUrl =
        $("meta[property='og:image']").attr("content") ||
        $("meta[property='og:image:secure_url']").attr("content") ||
        "";
    }
    if (supplierPrice === 0) {
      const mp =
        $("meta[property='product:price:amount']").attr("content") ||
        $("[itemprop='price']").attr("content");
      if (mp) supplierPrice = parseFloat(mp) || 0;
    }
  }

  // Clean title
  title = title
    .replace(/\\[nrt]/g, " ").replace(/\s+/g, " ")
    .replace(/\s*[-|]?\s*AliExpress.*$/i, "").trim();

  if (!title && supplierPrice === 0 && !imageUrl) {
    // Log a snippet for debugging (server-side only)
    console.error("[AliExpress scraper] No data found. HTML snippet:", html.slice(0, 500));
    throw new Error(
      "Données introuvables — AliExpress bloque la requête depuis notre serveur. " +
      "Réessayez dans quelques instants ou utilisez une autre URL."
    );
  }

  return {
    title: (title || "Produit AliExpress").substring(0, 200),
    description: "",
    imageUrl,
    supplierPrice,
    sellingPrice: (supplierPrice * multiplier).toFixed(2),
    margin: multiplier,
  };
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

    // --- AliExpress — RapidAPI / ScrapingBee / direct HTML fetch ---
    if (isAliexpressUrl(url)) {
      try {
        const preview = await scrapeAliExpress(url, multiplier);
        return NextResponse.json({ success: true, preview });
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === "ALIEXPRESS_API_REQUIRED") {
          return NextResponse.json({ success: false, error: "ALIEXPRESS_API_REQUIRED" });
        }
        console.error("[AliExpress scraper] Failed:", err);
        return NextResponse.json({
          success: false,
          error: `Impossible d'importer ce produit AliExpress : ${msg}`,
        });
      }
    }

    // --- CJ Dropshipping ---
    if (isCjUrl(url)) {
      const result = await scrapePage(url, multiplier);
      // Check for CAPTCHA / human-verification response
      const isCaptcha = !result.title ||
        result.title === "Produit importé" ||
        /human.?verif|captcha|access.?denied|robot|bot.?detect/i.test(result.title);
      if (result && result.title && !isCaptcha) {
        return NextResponse.json({ success: true, preview: result });
      }
      // Demo fallback — CJ pages are JS-rendered or return CAPTCHA
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
    try {
      const preview = await scrapePage(url, multiplier);
      // If scraping got no useful title, flag it so user can edit before importing
      if (!preview.title || preview.title === "Produit importé") {
        return NextResponse.json({
          success: true,
          preview: {
            ...preview,
            title: preview.title || "Produit importé",
            note: "Le titre n'a pas pu être extrait automatiquement — modifiez-le avant l'import",
          },
        });
      }
      return NextResponse.json({ success: true, preview });
    } catch (scrapeError) {
      throw scrapeError;
    }
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
  title = title.replace(/\s*[|-]\s*(AliExpress|Amazon|Cdiscount|CJDropshipping|eBay|AliExpress\.com).*$/i, "").trim();

  return {
    title: title.substring(0, 200),
    description: description.substring(0, 3000),
    imageUrl,
    supplierPrice,
    sellingPrice: (supplierPrice * multiplier).toFixed(2),
    margin: multiplier,
  };
}
