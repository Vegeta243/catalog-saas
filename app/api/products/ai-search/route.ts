import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import * as cheerio from "cheerio";

// Demo products for when OpenAI key isn't set or rate limit hit
interface DemoProduct {
  title: string;
  supplierPrice: number;
  salePrice: number;
  margin: number;
}

function buildDemoProducts(niche: string, platform: string, minMargin: number, maxPrice: number): object[] {
  const nicheMap: Record<string, DemoProduct[]> = {
    "Mode femme": [
      { title: "Veste en jean oversize femme tendance 2026", supplierPrice: 8.5, salePrice: 24.9, margin: 2.9 },
      { title: "Sac à main bandoulière canvas rétro", supplierPrice: 4.2, salePrice: 14.9, margin: 3.5 },
      { title: "Sneakers chunky femme semelle épaisse", supplierPrice: 12.0, salePrice: 39.9, margin: 3.3 },
      { title: "Robe midi fleurie été légère", supplierPrice: 6.8, salePrice: 22.9, margin: 3.4 },
    ],
    Mode: [
      { title: "Veste en jean oversize femme tendance 2026", supplierPrice: 8.5, salePrice: 24.9, margin: 2.9 },
      { title: "Sac à main bandoulière canvas rétro", supplierPrice: 4.2, salePrice: 14.9, margin: 3.5 },
    ],
    "Gadgets tech": [
      { title: "Écouteurs sans fil TWS Bluetooth 5.3 ANC", supplierPrice: 5.5, salePrice: 19.9, margin: 3.6 },
      { title: "Chargeur magnétique 3-en-1 iPhone/Android", supplierPrice: 7.0, salePrice: 24.9, margin: 3.6 },
      { title: "Lampe LED bureau pliable USB-C", supplierPrice: 4.8, salePrice: 17.9, margin: 3.7 },
      { title: "Support téléphone voiture magnétique universel", supplierPrice: 2.5, salePrice: 9.9, margin: 4.0 },
    ],
    Tech: [
      { title: "Écouteurs sans fil TWS Bluetooth 5.3 ANC", supplierPrice: 5.5, salePrice: 19.9, margin: 3.6 },
      { title: "Lampe LED bureau pliable USB-C", supplierPrice: 4.8, salePrice: 17.9, margin: 3.7 },
    ],
    "Décoration intérieure": [
      { title: "Diffuseur d'huiles essentielles LED 300ml", supplierPrice: 6.2, salePrice: 22.9, margin: 3.7 },
      { title: "Vase pampa décoratif nordique", supplierPrice: 2.9, salePrice: 11.9, margin: 4.1 },
      { title: "Projecteur étoiles galaxie chambre enfant", supplierPrice: 7.5, salePrice: 24.9, margin: 3.3 },
      { title: "Organisateur tiroir modulable cuisine", supplierPrice: 3.8, salePrice: 14.9, margin: 3.9 },
    ],
    Maison: [
      { title: "Diffuseur d'huiles essentielles LED 300ml", supplierPrice: 6.2, salePrice: 22.9, margin: 3.7 },
      { title: "Organisateur tiroir modulable cuisine", supplierPrice: 3.8, salePrice: 14.9, margin: 3.9 },
    ],
    "Fitness & Sport": [
      { title: "Legging gainant push-up fitness femme", supplierPrice: 6.5, salePrice: 22.9, margin: 3.5 },
      { title: "Bouteille thermos sport 1L double paroi", supplierPrice: 5.2, salePrice: 19.9, margin: 3.8 },
      { title: "Tapis de yoga antidérapant 6mm", supplierPrice: 7.0, salePrice: 24.9, margin: 3.6 },
      { title: "Résistances élastiques musculation kit 5", supplierPrice: 3.5, salePrice: 14.9, margin: 4.3 },
    ],
    Sport: [
      { title: "Legging gainant push-up fitness femme", supplierPrice: 6.5, salePrice: 22.9, margin: 3.5 },
      { title: "Tapis de yoga antidérapant 6mm", supplierPrice: 7.0, salePrice: 24.9, margin: 3.6 },
    ],
  };
  const base = nicheMap[niche] || nicheMap[niche.split(" ")[0]] || nicheMap["Mode"];
  const competition = ["Faible", "Moyen", "Élevé"] as const;
  return (base || [])
    .filter((p) => p.supplierPrice <= maxPrice && p.margin >= minMargin)
    .map((p, i) => ({
      ...p,
      image: "",
      platform,
      url: `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(p.title.replace(/\s+/g, "+"))}`,
      trendingScore: Math.floor(Math.random() * 4) + 6,
      competition: competition[i % 3],
      rating: (3.8 + Math.random() * 1.1).toFixed(1),
    }));
}

/** Try to scrape real AliExpress search results. Returns [] on any error. */
async function scrapeAliExpressSearch(query: string, maxPrice: number): Promise<object[]> {
  const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}&currency=EUR&sortType=total_tranpro_desc`;
  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.aliexpress.com/",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(18000),
    });
    if (!res.ok) return [];
    // Detect gateway redirect
    if (res.url.includes("gatewayAdapt") || res.url.includes("gateway")) return [];
    const html = await res.text();
    if (/captcha|verify[\s_-]?human|cloudflare.*ray/i.test(html.slice(0, 5000))) return [];

    const products: object[] = [];

    // Try JSON embedded in page
    const jsonPatterns = [
      /window\.runParams\s*=\s*(\{[\s\S]*?"mods"[\s\S]*?\});\s*(?:var |window\.|<\/)/,
      /"listItems"\s*:\s*(\[[\s\S]*?\])\s*,\s*"resultCount"/,
    ];
    for (const pattern of jsonPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: any = JSON.parse(match[1]);
          const items = data?.mods?.itemList?.content || data || [];
          if (Array.isArray(items)) {
            for (const item of items.slice(0, 12)) {
              const title = item?.title?.seoTitle || item?.title?.displayTitle || item?.subject || "";
              const priceRaw = item?.prices?.salePrice?.minPrice || item?.prices?.originalPrice?.minPrice || item?.salePrice || "0";
              const price = parseFloat(String(priceRaw)) || 0;
              const imgPath = item?.image?.imgUrl || item?.mainImageUrl || "";
              const img = imgPath ? (imgPath.startsWith("http") ? imgPath : `https:${imgPath}`) : "";
              const productId = item?.productId || item?.itemId || "";
              const url = productId ? `https://www.aliexpress.com/item/${productId}.html` : searchUrl;
              const orders = parseInt(String(item?.trade?.tradeDesc || item?.orders || "0").replace(/[^\d]/g, ""), 10) || 0;
              const ratingVal = parseFloat(String(item?.evaluation?.starRating || item?.starRating || "0")) || 0;
              if (title && price > 0 && price <= maxPrice) {
                products.push({
                  title: String(title).substring(0, 100),
                  supplierPrice: price,
                  salePrice: parseFloat((price * 2.8).toFixed(2)),
                  margin: 2.8,
                  image: img,
                  platform: "AliExpress",
                  url,
                  trendingScore: Math.floor(Math.random() * 4) + 6,
                  competition: (["Faible", "Moyen", "Élevé"] as const)[Math.floor(Math.random() * 3)],
                  rating: ratingVal > 0 ? ratingVal.toFixed(1) : (3.8 + Math.random() * 1.1).toFixed(1),
                  orders,
                });
              }
            }
            if (products.length > 0) return products;
          }
        } catch { /* continue */ }
      }
    }

    // Cheerio fallback: parse product cards from HTML
    const $ = cheerio.load(html);
    $("[class*='product-card'], [class*='item-wrap'], [class*='search-card'], a[href*='/item/']").each((_, el) => {
      if (products.length >= 12) return false;
      const $el = $(el);
      const title = $el.find("h3, [class*='title'], [class*='name']").first().text().trim();
      const priceText = $el.find("[class*='price'], [class*='sale-price']").first().text().replace(/[^\d,.]/g, "").replace(",", ".").trim();
      const price = parseFloat(priceText) || 0;
      const imgSrc = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || "";
      const img = imgSrc ? (imgSrc.startsWith("//") ? `https:${imgSrc}` : imgSrc) : "";
      const href = $el.attr("href") || $el.find("a[href*='/item/']").first().attr("href") || "";
      const url = href.startsWith("http") ? href : `https://www.aliexpress.com${href}`;
      if (title.length > 5 && price > 0 && price <= maxPrice) {
        products.push({
          title: title.substring(0, 100),
          supplierPrice: price,
          salePrice: parseFloat((price * 2.8).toFixed(2)),
          margin: 2.8,
          image: img,
          platform: "AliExpress",
          url,
          trendingScore: Math.floor(Math.random() * 4) + 6,
          competition: (["Faible", "Moyen", "Élevé"] as const)[Math.floor(Math.random() * 3)],
          rating: (3.8 + Math.random() * 1.1).toFixed(1),
          orders: 0,
        });
      }
    });

    return products;
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    // Rate limit
    const rateResult = await checkRateLimit(user.id, "ai.generate");
    if (!rateResult.allowed) {
      return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
    }

    const body = await req.json();
    const { platform = "AliExpress", niche = "Mode femme", minPrice = 0, maxPrice = 50, minMargin = 2, trend = "trending", keywords = "" } = body;

    let products: object[] = [];
    const searchQuery = keywords || niche;

    // 1. Try real AliExpress scrape (AliExpress only, <25s budget)
    if (platform === "AliExpress") {
      products = await scrapeAliExpressSearch(searchQuery, parseFloat(maxPrice));
    }

    // 2. If OpenAI is configured and real scrape got nothing, use AI
    const apiKey = process.env.OPENAI_API_KEY;
    if (products.length === 0 && apiKey) {
      try {
        const prompt = `Tu es un expert dropshipping. L'utilisateur cherche des produits sur "${platform}" dans la niche "${niche}".
Filtre: prix fournisseur ${minPrice}€-${maxPrice}€, marge ≥ ×${minMargin}, tendance "${trend}"${keywords ? `, mots-clés: "${keywords}"` : ""}.

Génère 8 idées de produits gagnants pour le marché français en 2026.
Pour chaque produit, donne un JSON avec:
- title: titre commercial en français (max 80 chars)
- supplierPrice: prix chez le fournisseur en EUR
- salePrice: prix de vente recommandé en EUR  
- margin: multiplicateur (ex: 3.2)
- competition: "Faible" | "Moyen" | "Élevé"
- trendingScore: score 1-10
- url: URL de recherche AliExpress fr

Réponds UNIQUEMENT avec un tableau JSON valide.`;

        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 2000,
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\[[\s\S]+\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              products = parsed.map((p: Record<string, unknown>) => ({
                ...p,
                image: "",
                platform,
                rating: (3.8 + Math.random() * 1.1).toFixed(1),
              }));
            }
          }
        }
      } catch { /* Fall through to demo */ }
    }

    // 3. Final fallback: demo data
    if (products.length === 0) {
      products = buildDemoProducts(niche, platform, parseFloat(minMargin), parseFloat(maxPrice));
    }

    // Apply margin filter
    products = (products as Array<Record<string, unknown>>).filter(
      p => parseFloat(String(p.margin)) >= parseFloat(minMargin) && parseFloat(String(p.supplierPrice)) <= parseFloat(maxPrice)
    );

    return NextResponse.json({ products, demo: products.length === 0 });
  } catch (e) {
    console.error("[ai-search]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}


// Demo products for when OpenAI key isn't set or rate limit hit