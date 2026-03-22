import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function verifyWebhookHmac(body: string, hmacHeader: string): boolean {
  try {
    const secret = process.env.SHOPIFY_API_SECRET || "";
    if (!secret) return false;
    const generated = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");
    return crypto.timingSafeEqual(
      Buffer.from(generated, "base64"),
      Buffer.from(hmacHeader, "base64")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
  const shop = req.headers.get("x-shopify-shop-domain") || "";

  if (!verifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  // Mark shop as uninstalled in DB
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase
      .from("shops")
      .update({ is_active: false, access_token: null, uninstalled_at: new Date().toISOString() })
      .eq("shop_domain", shop);
  } catch (e) {
    console.error("Error marking shop uninstalled:", e);
  }

  return NextResponse.json({ ok: true });
}
