// GDPR: customers/data_request — merchant requested data export for a customer
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

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
  if (!verifyHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }
  // EcomPilot stores: shop domain, access token, product edits.
  // No personal customer data is stored — acknowledge the request.
  return NextResponse.json({ ok: true });
}
