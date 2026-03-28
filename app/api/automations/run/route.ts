import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const maxDuration = 60;

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
    const { data } = await adminClient().auth.getUser(auth.slice(7));
    if (data.user) return data.user;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const { data: auto, error: autoErr } = await adminClient()
      .from("automations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (autoErr || !auto) return NextResponse.json({ error: "Automatisation introuvable" }, { status: 404 });
    if (!auto.is_active) return NextResponse.json({ error: "Automatisation en pause" }, { status: 400 });

    const cfg = auto.config ?? {};
    let result: { success: boolean; message: string; details?: Record<string, unknown> } = {
      success: true, message: "Execution terminee", details: {}
    };

    // Get shop for Shopify-connected actions
    const { data: shops } = await adminClient().from("shops").select("*").eq("user_id", user.id).eq("is_active", true).limit(1);
    const shop = shops?.[0];

    switch (auto.type) {

      case "seo": {
        const limit = Number(cfg.max_per_run ?? 5);
        const { data: products } = await adminClient()
          .from("shopify_products").select("id, title, body_html, vendor")
          .eq("user_id", user.id).limit(limit);
        if (!products?.length) { result.message = "Aucun produit trouve. Synchronisez vos produits Shopify d'abord."; break; }
        let updated = 0;
        for (const p of products) {
          const newTitle = p.title.trim().replace(/\s+/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
          await adminClient().from("shopify_products").update({ title: newTitle }).eq("id", p.id);
          updated++;
        }
        result = { success: true, message: updated + " titre(s) optimises pour le SEO", details: { productsOptimized: updated } };
        break;
      }

      case "price": {
        const action = cfg.action ?? "increase";
        const pct = parseFloat(String(cfg.percent ?? 10)) / 100;
        const maxProducts = Number(cfg.max_products ?? 50);
        const { data: products } = await adminClient()
          .from("shopify_products").select("id, title, price, shopify_product_id")
          .eq("user_id", user.id).not("price", "is", null).limit(maxProducts);
        if (!products?.length) { result.message = "Aucun produit trouve."; break; }
        let updated = 0;
        for (const p of products) {
          const cur = parseFloat(String(p.price));
          if (!cur) continue;
          const newPrice = action === "increase"
            ? Math.round(cur * (1 + pct) * 100) / 100
            : Math.round(cur * (1 - pct) * 100) / 100;
          if (newPrice <= 0) continue;
          await adminClient().from("shopify_products").update({ price: newPrice }).eq("id", p.id);
          if (shop?.shopify_domain && p.shopify_product_id) {
            await fetch(`https://${shop.shopify_domain}/admin/api/2024-01/products/${p.shopify_product_id}/variants.json`,
              { headers: { "X-Shopify-Access-Token": shop.access_token ?? "" } })
              .then(r => r.json()).then(async (d) => {
                const vid = d.variants?.[0]?.id;
                if (vid) await fetch(`https://${shop.shopify_domain}/admin/api/2024-01/variants/${vid}.json`,
                  { method: "PUT", headers: { "X-Shopify-Access-Token": shop.access_token ?? "", "Content-Type": "application/json" },
                    body: JSON.stringify({ variant: { id: vid, price: String(newPrice) } }),
                    signal: AbortSignal.timeout(5000) }).catch(() => {});
              }).catch(() => {});
          }
          updated++;
        }
        result = { success: true, message: updated + " prix " + (action === "increase" ? "augmentes" : "diminues") + " de " + cfg.percent + "%", details: { productsUpdated: updated, action, percent: cfg.percent } };
        break;
      }

      case "title_template": {
        const template = String(cfg.template ?? "{title} | {vendor}");
        const limit = Number(cfg.max_per_run ?? 10);
        const { data: products } = await adminClient()
          .from("shopify_products").select("id, title, vendor, product_type")
          .eq("user_id", user.id).limit(limit);
        if (!products?.length) { result.message = "Aucun produit trouve."; break; }
        let updated = 0;
        for (const p of products) {
          const newTitle = template
            .replace("{title}", p.title ?? "")
            .replace("{vendor}", p.vendor ?? "")
            .replace("{type}", p.product_type ?? "")
            .slice(0, 255);
          await adminClient().from("shopify_products").update({ title: newTitle }).eq("id", p.id);
          updated++;
        }
        result = { success: true, message: updated + " titres formates avec le modele", details: { updated, template } };
        break;
      }

      case "tag_add": {
        const toAdd = String(cfg.tags ?? "").split(",").map((t: string) => t.trim()).filter(Boolean);
        if (!toAdd.length) { result.message = "Aucun tag configure."; break; }
        const { data: products } = await adminClient().from("shopify_products").select("id, tags").eq("user_id", user.id).limit(200);
        let updated = 0;
        for (const p of products ?? []) {
          const existing = String(p.tags ?? "").split(",").map((t: string) => t.trim()).filter(Boolean);
          const merged = [...new Set([...existing, ...toAdd])].join(", ");
          if (merged !== String(p.tags ?? "")) {
            await adminClient().from("shopify_products").update({ tags: merged }).eq("id", p.id);
            updated++;
          }
        }
        result = { success: true, message: "Tags \"" + toAdd.join(", ") + "\" ajoutes a " + updated + " produit(s)", details: { updated, tagsAdded: toAdd.length } };
        break;
      }

      case "tag_remove": {
        const toRemove = String(cfg.tags ?? "").split(",").map((t: string) => t.trim()).filter(Boolean);
        if (!toRemove.length) { result.message = "Aucun tag configure."; break; }
        const { data: products } = await adminClient().from("shopify_products").select("id, tags").eq("user_id", user.id).limit(200);
        let updated = 0;
        for (const p of products ?? []) {
          const existing = String(p.tags ?? "").split(",").map((t: string) => t.trim()).filter(Boolean);
          const filtered = existing.filter((t: string) => !toRemove.includes(t)).join(", ");
          if (filtered !== String(p.tags ?? "")) {
            await adminClient().from("shopify_products").update({ tags: filtered }).eq("id", p.id);
            updated++;
          }
        }
        result = { success: true, message: "Tags supprimes sur " + updated + " produit(s)", details: { updated } };
        break;
      }

      case "status_change": {
        const fromStatus = String(cfg.from_status ?? "draft");
        const toStatus = fromStatus === "draft" ? "active" : fromStatus === "active" ? "archived" : "active";
        const { data: products } = await adminClient()
          .from("shopify_products").select("id").eq("user_id", user.id).eq("status", fromStatus).limit(100);
        if (!products?.length) { result.message = "Aucun produit en statut \"" + fromStatus + "\""; break; }
        await adminClient().from("shopify_products").update({ status: toStatus }).eq("user_id", user.id).eq("status", fromStatus);
        result = { success: true, message: products.length + " produits passes de \"" + fromStatus + "\" a \"" + toStatus + "\"", details: { updated: products.length, from: fromStatus, to: toStatus } };
        break;
      }

      case "sync_shopify": {
        if (!shop?.shopify_domain || !shop?.access_token) {
          result = { success: false, message: "Aucune boutique Shopify connectee.", details: {} };
          break;
        }
        const syncRes = await fetch(`https://${shop.shopify_domain}/admin/api/2024-01/products.json?limit=50`,
          { headers: { "X-Shopify-Access-Token": shop.access_token } }).catch(() => null);
        if (!syncRes?.ok) { result = { success: false, message: "Impossible de contacter Shopify", details: {} }; break; }
        const { products: spProducts } = await syncRes.json();
        let synced = 0;
        for (const sp of spProducts ?? []) {
          await adminClient().from("shopify_products").upsert({
            user_id: user.id, shopify_product_id: String(sp.id), title: sp.title,
            body_html: sp.body_html ?? "", price: parseFloat(sp.variants?.[0]?.price ?? "0"),
            image_url: sp.images?.[0]?.src ?? null, status: sp.status ?? "active",
            vendor: sp.vendor ?? "", tags: sp.tags ?? ""
          }, { onConflict: "user_id,shopify_product_id" });
          synced++;
        }
        result = { success: true, message: synced + " produit(s) synchronises depuis Shopify", details: { synced, shop: shop.shopify_domain } };
        break;
      }

      case "description_add": {
        const prefix = String(cfg.prefix ?? "");
        const suffix = String(cfg.suffix ?? "");
        const limit = Number(cfg.max_per_run ?? 10);
        const { data: nullDesc } = await adminClient().from("shopify_products").select("id, body_html").eq("user_id", user.id).is("body_html", null).limit(limit);
        const { data: emptyDesc } = await adminClient().from("shopify_products").select("id, body_html").eq("user_id", user.id).eq("body_html", "").limit(limit);
        const toUpdate = [...(nullDesc ?? []), ...(emptyDesc ?? [])].slice(0, limit);
        if (!toUpdate.length) { result.message = "Tous les produits ont deja une description."; break; }
        for (const p of toUpdate) {
          const newDesc = [prefix, p.body_html ?? "", suffix].filter(Boolean).join(" ").trim();
          await adminClient().from("shopify_products").update({ body_html: newDesc }).eq("id", p.id);
        }
        result = { success: true, message: "Description ajoutee a " + toUpdate.length + " produit(s)", details: { updated: toUpdate.length } };
        break;
      }

      default:
        result = { success: true, message: "Automatisation de type \"" + auto.type + "\" executee", details: {} };
    }

    // Update run stats
    await adminClient().from("automations").update({
      last_run_at: new Date().toISOString(),
      run_count: (auto.run_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error("[automations/run]", e);
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
