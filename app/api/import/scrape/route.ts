import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

export async function POST(req: Request) {
  try {
    const { url, margin } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL manquante." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("shop_domain, access_token")
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: "Boutique non connectée." }, { status: 400 });
    }

    // Scrape the product page
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!pageRes.ok) {
      return NextResponse.json({ error: "Impossible de charger cette URL." }, { status: 400 });
    }

    const html = await pageRes.text();
    const $ = cheerio.load(html);

    // Try to extract product info (generic scraping)
    let title = $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim() ||
      "Produit importé";

    let description = $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";

    let imageUrl = $('meta[property="og:image"]').attr("content") ||
      $("img.product-image, img.main-image, img[data-role='image']").first().attr("src") ||
      "";

    // Try to find price
    let priceText = $(".product-price, .price, [data-price], .uniform-banner-box-price").first().text().trim();
    let supplierPrice = 0;
    const priceMatch = priceText.match(/[\d,.]+/);
    if (priceMatch) {
      supplierPrice = parseFloat(priceMatch[0].replace(",", "."));
    }

    const multiplier = margin || 2.5;
    const sellingPrice = (supplierPrice * multiplier).toFixed(2);

    // Return preview data without creating the product
    return NextResponse.json({
      success: true,
      preview: {
        title: title.substring(0, 200),
        description: description.substring(0, 2000),
        imageUrl,
        supplierPrice,
        sellingPrice,
        margin: multiplier,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
