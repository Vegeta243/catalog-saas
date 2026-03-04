// GDPR: customers/redact — erase customer data
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
  if (!verifyHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }
  // No personal customer data stored — acknowledge.
  console.log("[GDPR] customers/redact received");
  return NextResponse.json({ ok: true });
}
