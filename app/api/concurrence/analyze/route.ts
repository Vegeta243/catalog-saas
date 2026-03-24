import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import { logAction } from "@/lib/log-action";

// GET — list user's competitors
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { data } = await supabase
    .from("competitors")
    .select("*, competitor_snapshots(id, products_found, avg_price, analyzed_at)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return NextResponse.json({ competitors: data || [] });
}

// POST — add a new competitor OR analyze existing one
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  if (action === "add") {
    const { name, url } = body;
    if (!name || !url) return NextResponse.json({ error: "Nom et URL requis." }, { status: 400 });
    try { new URL(url); } catch { return NextResponse.json({ error: "URL invalide." }, { status: 400 }); }

    const platform = url.includes("shopify") || url.includes("myshopify") ? "shopify"
      : url.includes("woocommerce") || url.includes("wp-content") ? "woocommerce"
      : "other";

    const { data, error } = await supabase.from("competitors").insert({
      user_id: user.id, name, url, shop_platform: platform,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ competitor: data }, { status: 201 });
  }

  if (action === "analyze") {
    const { competitor_id } = body;
    if (!competitor_id) return NextResponse.json({ error: "competitor_id requis." }, { status: 400 });

    // Fetch user quota, competitor, and previous snapshot in parallel
    const [{ data: userData }, { data: competitor }, { data: prevSnapshots }] = await Promise.all([
      supabase.from("users").select("actions_used, actions_limit").eq("id", user.id).single(),
      supabase.from("competitors").select("*").eq("id", competitor_id).eq("user_id", user.id).single(),
      supabase.from("competitor_snapshots").select("*").eq("competitor_id", competitor_id).order("analyzed_at", { ascending: false }).limit(1),
    ]);

    if (userData && userData.actions_used + 5 > (userData.actions_limit || 50)) {
      return NextResponse.json({ error: "Quota insuffisant (5 tâches requises)." }, { status: 403 });
    }

    if (!competitor) return NextResponse.json({ error: "Concurrent introuvable." }, { status: 404 });

    const prevSnapshot = prevSnapshots?.[0] || null;

    // Fetch competitor page with 15s timeout — non-fatal on error
    let html = "";
    let fetchError = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(competitor.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch {
      fetchError = true;
    }

    // Extract products with cheerio
    const $ = cheerio.load(html);
    const products: { title: string; price: number | null; url: string }[] = [];

    $('[class*="product"], [data-product], .product-card, .product-item, .grid__item').each((_, el) => {
      const title = $(el).find('[class*="title"], [class*="name"], h2, h3').first().text().trim();
      const priceText = $(el).find('[class*="price"], .money, [data-price]').first().text().trim();
      const link = $(el).find('a').first().attr('href') || '';
      if (title) {
        const priceMatch = priceText.match(/[\d,.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(",", ".")) : null;
        const fullUrl = link.startsWith("http") ? link : link.startsWith("/") ? new URL(link, competitor.url).href : "";
        products.push({ title, price, url: fullUrl });
      }
    });

    const uniqueProducts = products.filter((p, i, arr) => arr.findIndex(x => x.title === p.title) === i).slice(0, 50);
    const prices = uniqueProducts.filter(p => p.price !== null).map(p => p.price as number);
    const avgPrice = prices.length > 0
      ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
      : null;

    // Detect changes vs previous snapshot
    const prevProducts = (prevSnapshot?.raw_data as { products?: { title: string; price: number | null }[] })?.products || [];
    const priceChanges: { product: string; old_price: number; new_price: number; direction: string }[] = [];
    const newProducts: string[] = [];
    const removedProducts: string[] = [];

    const prevTitles = new Set(prevProducts.map((p: { title: string }) => p.title));
    const currTitles = new Set(uniqueProducts.map(p => p.title));

    for (const p of uniqueProducts) {
      if (!prevTitles.has(p.title)) {
        newProducts.push(p.title);
      } else {
        const prev = prevProducts.find((pp: { title: string; price: number | null }) => pp.title === p.title);
        if (prev && prev.price !== null && p.price !== null && prev.price !== p.price) {
          priceChanges.push({ product: p.title, old_price: prev.price, new_price: p.price, direction: p.price < prev.price ? "down" : "up" });
        }
      }
    }
    for (const pp of prevProducts) {
      if (!currTitles.has((pp as { title: string }).title)) removedProducts.push((pp as { title: string }).title);
    }

    // Enriched signals extraction
    const fullText = html.toLowerCase();
    const promo_detected = /soldes|promo|discount|sale|-\d+%|offre|liquidation|flash/.test(fullText);

    let shipping_info = "Non détecté";
    const shippingMatch = html.match(/livraison gratuite[^<.]{0,60}|free shipping[^<.]{0,60}|frais de port offerts[^<.]{0,60}/i);
    if (shippingMatch) shipping_info = shippingMatch[0].replace(/<[^>]+>/g, "").trim().slice(0, 100);

    let avg_rating: number | null = null;
    let review_count = 0;
    const ratingMatch = fullText.match(/(\d[.,]\d)\s*\/\s*5/);
    if (ratingMatch) avg_rating = parseFloat(ratingMatch[1].replace(",", "."));
    const reviewMatch = fullText.match(/(\d+)\s*(avis|reviews|évaluations)/i);
    if (reviewMatch) review_count = parseInt(reviewMatch[1], 10);

    // Social & payment signals
    const links = $("a[href]").map((_, el) => $(el).attr("href") || "").get();
    const social = {
      facebook: links.some(l => l.includes("facebook.com")),
      instagram: links.some(l => l.includes("instagram.com")),
      tiktok: links.some(l => l.includes("tiktok.com")),
    };
    const allText = fullText + links.join(" ");
    const payment = {
      paypal: /paypal/.test(allText),
      stripe: /stripe/.test(allText),
      klarna: /klarna/.test(allText),
    };

    // SEO signals
    const seo = {
      title_tag: $("title").first().text().trim().slice(0, 100),
      has_meta_description: ($('meta[name="description"]').attr("content") || "").length > 0,
      h1_count: $("h1").length,
    };

    // AI insights — always generate 5 recommendations
    let insights: string[] = [];
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Tu es un expert e-commerce. Génère exactement 5 recommandations courtes et actionnables en français pour améliorer la compétitivité face à ce concurrent. Retourne un JSON array de 5 strings.",
          },
          {
            role: "user",
            content: JSON.stringify({ competitorName: competitor.name, products_found: uniqueProducts.length, avg_price: avgPrice, promo_detected, shipping_info, avg_rating, priceChanges, newProducts, removedProducts, social, payment }),
          },
        ],
        temperature: 0.7,
        max_tokens: 700,
      });
      const content = completion.choices[0]?.message?.content || "[]";
      try {
        const match = content.match(/\[[\s\S]*\]/);
        insights = JSON.parse(match ? match[0] : content);
      } catch { insights = []; }
    } catch { /* OpenAI error — skip */ }

    // Save enriched snapshot
    await Promise.all([
      supabase.from("competitor_snapshots").insert({
        competitor_id,
        user_id: user.id,
        products_found: uniqueProducts.length,
        avg_price: avgPrice,
        price_changes: priceChanges,
        new_products: newProducts,
        removed_products: removedProducts,
        raw_data: { products: uniqueProducts, promo_detected, shipping_info, avg_rating, review_count, social, payment, seo, insights, fetch_error: fetchError },
      }),
      supabase.from("competitors").update({ last_analyzed_at: new Date().toISOString() }).eq("id", competitor_id),
      supabase.rpc("increment_actions", { p_user_id: user.id, p_count: 5 }),
      logAction(supabase, {
        userId: user.id,
        actionType: "competitor.analyze",
        description: `Analyse concurrentielle: ${competitor.name} — ${uniqueProducts.length} produits`,
        creditsUsed: 5,
        details: { competitor_id, products_found: uniqueProducts.length, changes: priceChanges.length + newProducts.length + removedProducts.length },
      }),
    ]);

    return NextResponse.json({
      products_found: uniqueProducts.length,
      avg_price: avgPrice,
      price_changes: priceChanges,
      new_products: newProducts,
      removed_products: removedProducts,
      insights,
      promo_detected,
      shipping_info,
      avg_rating,
      review_count,
      social,
      payment,
      seo,
    });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}

// DELETE — remove a competitor
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });

  await supabase.from("competitor_snapshots").delete().eq("competitor_id", id).eq("user_id", user.id);
  await supabase.from("competitors").delete().eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
