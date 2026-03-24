// GDPR: shop/redact — erase all shop data after uninstall (48h after)
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
    return crypto.timingSafeEqual(
      Buffer.from(generated, "base64"),
      Buffer.from(hmac, "base64")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
  const shop = req.headers.get("x-shopify-shop-domain") || "";

  if (!verifyHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    // Delete all shop data permanently
    await Promise.all([
      supabase.from("shops").delete().eq("shop_domain", shop),
      supabase.from("import_history").delete().eq("shop_domain", shop),
      supabase.from("action_history").delete().eq("shop_domain", shop),
    ]);
  } catch (e) {
    console.error("[GDPR] shop/redact error:", e);
  }

  return NextResponse.json({ ok: true });
}
