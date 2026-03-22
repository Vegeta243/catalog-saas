// Webhook: products/create, products/update, products/delete
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function verifyHmac(body: string, hmac: string): boolean {
  try {
    const secret = process.env.SHOPIFY_API_SECRET || "";
    if (!secret) return false;
    const generated = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(generated, "base64"),
      Buffer.from(hmac, "base64")
    );
  } catch {
    return false;
  }
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
  const topic = req.headers.get("x-shopify-topic") || "";
  const shopDomain = req.headers.get("x-shopify-shop-domain") || "";

  if (!verifyHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  try {
    const product = JSON.parse(rawBody);
    const supabase = adminClient();

    // Find the shop record
    const { data: shop } = await supabase
      .from("shops")
      .select("id, user_id")
      .eq("shop_domain", shopDomain)
      .single();

    if (!shop) {
      // Unknown shop — acknowledge and ignore
      return NextResponse.json({ ok: true });
    }

    if (topic === "products/delete") {
      await supabase
        .from("products")
        .delete()
        .eq("shopify_id", String(product.id))
        .eq("user_id", shop.user_id);
    } else if (topic === "products/update" || topic === "products/create") {
      await supabase
        .from("products")
        .upsert(
          {
            shopify_id: String(product.id),
            user_id: shop.user_id,
            shop_id: shop.id,
            title: product.title ?? "",
            status: product.status ?? "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "shopify_id,user_id" }
        );
    }
  } catch {
    // Non-fatal — still return 200 so Shopify doesn't retry
  }

  return NextResponse.json({ ok: true });
}
