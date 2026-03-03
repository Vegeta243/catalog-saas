import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    const { productIds, newPrice } = await req.json();

    if (!productIds || !newPrice) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const results = await Promise.all(
      productIds.map(async (id: string) => {
        const response = await fetch(
          `https://your-shopify-store.myshopify.com/admin/api/2026-01/variants/${id}.json`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
            },
            body: JSON.stringify({
              variant: { price: newPrice },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Erreur lors de la mise à jour du produit ${id}`);
        }

        return response.json();
      })
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}