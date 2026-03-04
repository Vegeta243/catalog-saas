// Webhook: products/create, products/update, products/delete
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function verifyHmac(body: string, hmac: string): boolean {
  const generated = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET || "")
    .update(body, "utf8")
    .digest("base64");
  return generated === hmac;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
  const topic = req.headers.get("x-shopify-topic") || "";
  const shop = req.headers.get("x-shopify-shop-domain") || "";

  if (!verifyHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  try {
    const product = JSON.parse(rawBody);
    console.log(`[Shopify Webhook] ${topic} — shop: ${shop} — product: ${product.id}`);
    // TODO: update local cache / re-score product visibility
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true });
}
