/**
 * /api/import/preview/route.ts
 * Enhanced preview endpoint with multi-strategy scraping and detailed product data
 */

import { NextResponse } from "next/server";
import { importProduct } from "@/lib/importers";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, margin = 1.5 } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: "URL manquante ou invalide" }, 
        { status: 400 }
      );
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json(
        { 
          error: "URL invalide - doit commencer par http:// ou https://",
          code: "INVALID_URL_FORMAT"
        }, 
        { status: 400 }
      );
    }

    console.log("[Preview] Fetching product data for:", url.slice(0, 80));

    // Import product using enhanced scrapers
    const result = await importProduct(url);

    if (!result.success || !result.product) {
      return NextResponse.json({
        success: false,
        error: result.error || "Impossible d'extraire les données du produit",
        code: "SCRAPE_FAILED",
        url,
      }, { status: 422 });
    }

    const product = result.product;

    // Apply margin to pricing
    const supplierPrice = product.price;
    const sellingPrice = Math.round(supplierPrice * margin * 100) / 100;
    const compareAtPrice = Math.round(sellingPrice * 1.2 * 100) / 100;

    return NextResponse.json({
      success: true,
      preview: {
        platform: product.platform,
        success: true as const,
        product: {
          title: product.title,
          description: product.description,
          price: sellingPrice,
          supplierPrice,
          compareAtPrice,
          margin,
          images: product.images,
          variants: product.variants,
          tags: product.tags,
          vendor: product.vendor,
        },
        url: product.sourceUrl,
        extractedAt: new Date().toISOString(),
      },
      meta: {
        platform: product.platform,
        imagesCount: product.images.length,
        variantsCount: product.variants.length,
        hasDescription: product.description.length > 50,
      },
    });
  } catch (error) {
    console.error("[Preview] Error:", error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Erreur serveur",
      code: "PREVIEW_ERROR",
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Endpoint d'aperçu d'import",
    usage: "POST avec { url: string, margin?: number }",
    supportedPlatforms: [
      "AliExpress",
      "Alibaba",
      "CJ Dropshipping",
      "DHgate",
      "Banggood",
      "Temu",
      "Autres (universal scraper)",
    ],
    features: [
      "Multi-strategy scraping",
      "Automatic retry with backoff",
      "Price extraction & margin calculation",
      "Image gallery extraction",
      "Product variants detection",
      "SEO tags generation",
    ],
  });
}
