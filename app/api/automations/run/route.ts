import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getUser(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const { data } = await adminClient().auth.getUser(token);
    if (data.user) return data.user;
  }
  return null;
}

// POST — run an automation by ID
export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    // Fetch automation (verify ownership)
    const { data: automation, error: fetchError } = await adminClient()
      .from("automations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !automation) {
      return NextResponse.json({ error: "Automatisation introuvable" }, { status: 404 });
    }

    if (!automation.is_active) {
      return NextResponse.json({ error: "Automatisation désactivée" }, { status: 400 });
    }

    const config = automation.config ?? {};
    let result: { success: boolean; message: string; details?: unknown } = {
      success: true,
      message: "Exécution terminée",
    };

    // ─── Execute by type ──────────────────────────────────────────────────────
    if (automation.type === "seo") {
      // Generate SEO descriptions for products missing them
      const limit = Number(config.limit ?? 20);
      const { data: products, error: pErr } = await adminClient()
        .from("shopify_products")
        .select("id, title, description")
        .eq("user_id", user.id)
        .or("description.is.null,description.eq.")
        .limit(limit);

      if (pErr) throw pErr;

      const updated: string[] = [];
      for (const p of products ?? []) {
        const seoDesc = `${p.title} — produit de qualité, disponible immédiatement. Description générée automatiquement.`;
        const { error: uErr } = await adminClient()
          .from("shopify_products")
          .update({ description: seoDesc })
          .eq("id", p.id);
        if (!uErr) updated.push(p.title);
      }

      result = {
        success: true,
        message: `SEO: ${updated.length} produit(s) mis à jour`,
        details: { updated },
      };
    } else if (automation.type === "price") {
      // Adjust prices by a percentage
      const percent = Number(config.percent ?? 0);
      const direction = config.direction === "decrease" ? -1 : 1;
      const factor = 1 + (direction * percent) / 100;

      if (percent === 0) {
        result = { success: false, message: "Pourcentage de prix non configuré (0%)" };
      } else {
        const { data: products, error: pErr } = await adminClient()
          .from("shopify_products")
          .select("id, title, price")
          .eq("user_id", user.id)
          .not("price", "is", null);

        if (pErr) throw pErr;

        const updated: string[] = [];
        for (const p of products ?? []) {
          const newPrice = Math.round(Number(p.price) * factor * 100) / 100;
          const { error: uErr } = await adminClient()
            .from("shopify_products")
            .update({ price: newPrice })
            .eq("id", p.id);
          if (!uErr) updated.push(p.title);
        }

        result = {
          success: true,
          message: `Prix: ${updated.length} produit(s) ajusté(s) de ${direction > 0 ? "+" : ""}${direction * percent}%`,
          details: { updated },
        };
      }
    } else if (automation.type === "import") {
      // Trigger a Shopify sync for the user's shop
      const { data: shop, error: shopErr } = await adminClient()
        .from("shops")
        .select("id, shopify_domain, access_token")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (shopErr || !shop) {
        result = { success: false, message: "Aucune boutique Shopify connectée" };
      } else {
        // Fetch products from Shopify API
        const shopifyRes = await fetch(
          `https://${shop.shopify_domain}/admin/api/2024-01/products.json?limit=50`,
          {
            headers: {
              "X-Shopify-Access-Token": shop.access_token,
              "Content-Type": "application/json",
            },
          }
        ).catch(() => null);

        if (!shopifyRes?.ok) {
          result = { success: false, message: "Impossible de contacter Shopify" };
        } else {
          const { products: shopifyProducts } = await shopifyRes.json();
          let synced = 0;
          for (const sp of shopifyProducts ?? []) {
            const price = sp.variants?.[0]?.price ?? "0";
            const image = sp.images?.[0]?.src ?? null;
            await adminClient()
              .from("shopify_products")
              .upsert({
                user_id: user.id,
                shopify_id: String(sp.id),
                title: sp.title,
                description: sp.body_html?.replace(/<[^>]+>/g, "") ?? "",
                price: parseFloat(price),
                image_url: image,
                status: sp.status ?? "active",
              }, { onConflict: "user_id,shopify_id" });
            synced++;
          }
          result = {
            success: true,
            message: `Import: ${synced} produit(s) synchronisé(s)`,
          };
        }
      }
    } else if (automation.type === "stock_alert") {
      // Find products with low stock
      const threshold = Number(config.threshold ?? 5);
      const { data: products, error: pErr } = await adminClient()
        .from("shopify_products")
        .select("id, title, stock_quantity")
        .eq("user_id", user.id)
        .not("stock_quantity", "is", null)
        .lte("stock_quantity", threshold);

      if (pErr) throw pErr;

      result = {
        success: true,
        message: `Alerte stock: ${(products ?? []).length} produit(s) sous le seuil de ${threshold}`,
        details: { lowStock: (products ?? []).map((p) => ({ title: p.title, qty: p.stock_quantity })) },
      };
    } else {
      result = { success: false, message: `Type inconnu: ${automation.type}` };
    }

    // Update last_run_at and run_count
    await adminClient()
      .from("automations")
      .update({
        last_run_at: new Date().toISOString(),
        run_count: (automation.run_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
