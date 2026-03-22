import { NextRequest, NextResponse } from "next/server";

const ALLOWED_DOMAINS = [
  "cjdropshipping.com",
  "cjsource.com",
  "alicdn.com",
  "aliexpress.com",
  "img.cjdropshipping.com",
  "cbu01.alicdn.com",
  "shopify.com",
  "cdn.shopify.com",
  "images.unsplash.com",
  "unsplash.com",
];

function isAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Reject non-HTTPS URLs (prevents HTTP downgrade / SSRF via localhost)
    if (parsed.protocol !== "https:") return false;
    // Reject localhost, 127.x, or private IP ranges (SSRF protection)
    const { hostname } = parsed;
    if (
      hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.") ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    ) return false;
    return ALLOWED_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  if (!isAllowed(imageUrl)) {
    return new NextResponse("Domain not allowed", { status: 403 });
  }

  try {
    // Choose the correct Referer based on image origin
    let referer = "https://www.cjdropshipping.com";
    try {
      const { hostname } = new URL(imageUrl);
      if (hostname.includes("alicdn.com") || hostname.includes("aliexpress.com")) {
        referer = "https://fr.aliexpress.com";
      }
    } catch { /* use default referer */ }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Referer: referer,
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
      },
    });

    if (!response.ok) {
      return new NextResponse("Upstream error", { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    // Only proxy actual image responses (reject HTML/text responses — CAPTCHA pages)
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Not an image", { status: 422 });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch image", { status: 502 });
  }
}
