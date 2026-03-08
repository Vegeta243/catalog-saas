import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ─── GET: list all product images from connected Shopify store ─────────────── */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data: shop } = await supabase
      .from("shops")
      .select("shop_domain, access_token")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!shop?.access_token) {
      return NextResponse.json({ products: [], message: "Boutique non connectée" });
    }

    const { shop_domain, access_token } = shop;

    const res = await fetch(
      `https://${shop_domain}/admin/api/2026-01/products.json?limit=100&fields=id,title,images`,
      { headers: { "X-Shopify-Access-Token": access_token } }
    );

    if (!res.ok) throw new Error(`Shopify ${res.status}`);

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = (data.products || []).map((p: any) => ({
      productId: String(p.id),
      productTitle: p.title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      images: (p.images || []).map((img: any) => ({
        id: String(img.id),
        src: img.src,
        alt: img.alt || p.title,
      })),
    })).filter((p: { images: unknown[] }) => p.images.length > 0);

    return NextResponse.json({ products });
  } catch (err) {
    console.error("GET /api/shopify/images:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ─── POST: upload processed image back to a Shopify product ────────────────── */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data: shop } = await supabase
      .from("shops")
      .select("shop_domain, access_token")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!shop?.access_token) {
      return NextResponse.json({ error: "Boutique non connectée" }, { status: 400 });
    }

    const { shop_domain, access_token } = shop;
    const { productId, imageId, imageBase64, filename } = await request.json();

    if (!productId || !imageBase64) {
      return NextResponse.json({ error: "productId and imageBase64 required" }, { status: 400 });
    }

    // Strip data URI prefix to get raw base64
    const b64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

    // Upload new image
    const uploadRes = await fetch(
      `https://${shop_domain}/admin/api/2026-01/products/${productId}/images.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": access_token,
        },
        body: JSON.stringify({
          image: {
            attachment: b64,
            filename: filename || "edited.jpg",
          },
        }),
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Shopify upload error: ${errText}`);
    }

    const uploadData = await uploadRes.json();
    const newImageSrc: string = uploadData.image?.src || "";

    // Delete old image if imageId provided
    if (imageId) {
      await fetch(
        `https://${shop_domain}/admin/api/2026-01/products/${productId}/images/${imageId}.json`,
        {
          method: "DELETE",
          headers: { "X-Shopify-Access-Token": access_token },
        }
      );
    }

    return NextResponse.json({ success: true, newSrc: newImageSrc });
  } catch (err) {
    console.error("POST /api/shopify/images:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
