import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: userData } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (userData?.plan !== "scale") {
      return NextResponse.json({ error: "Scale plan required" }, { status: 403 });
    }

    const body = await req.json();
    const { concept, targetMarket, style, productCount, source, priceRange, storeName, tagline } = body;

    if (!concept || !storeName) {
      return NextResponse.json({ error: "concept and storeName required" }, { status: 400 });
    }

    const storeConfig = {
      storeName,
      tagline: tagline || "",
      concept,
      targetMarket,
      style,
      productCount,
      source,
      priceRange,
    };

    // Check for Shopify credentials
    const shopifyDomain = process.env.SHOPIFY_DOMAIN;
    const shopifyToken = process.env.SHOPIFY_ADMIN_TOKEN;

    if (!shopifyDomain || !shopifyToken) {
      // Demo mode
      await new Promise(r => setTimeout(r, 2000));
      return NextResponse.json({
        success: true,
        demo: true,
        storeUrl: `https://${storeName.toLowerCase().replace(/\s+/g, "-")}.myshopify.com`,
        message: "Demo mode — configure SHOPIFY_DOMAIN and SHOPIFY_ADMIN_TOKEN to create real stores",
        config: storeConfig,
      });
    }

    // Real Shopify store creation via Admin API
    const shopRes = await fetch(`https://${shopifyDomain}/admin/api/2024-01/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": shopifyToken,
        "Content-Type": "application/json",
      },
    });

    if (!shopRes.ok) {
      return NextResponse.json({ error: "Cannot connect to Shopify" }, { status: 500 });
    }

    const shopData = await shopRes.json();

    return NextResponse.json({
      success: true,
      storeUrl: `https://${shopData.shop.domain}/admin`,
      storeName: shopData.shop.name,
      config: storeConfig,
    });
  } catch (err) {
    console.error("[create-ai]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
