import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// ──────────────────────────────────────────────────────────────────────────────
// Helper: return a Supabase admin client for writes (bypasses RLS safely)
// ──────────────────────────────────────────────────────────────────────────────
function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// GET — list the authenticated user's automation rules
// ──────────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const { data: rules, error } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ rules: rules ?? [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST — create a new automation rule
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const body = await req.json();
    const { name, condition_type, condition_value, action_type, action_value } = body;

    if (!name || !condition_type || !action_type) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const { data: rule, error } = await adminClient()
      .from("automation_rules")
      .insert({
        user_id: user.id,
        name,
        condition_type,
        condition_value: condition_value ?? "",
        action_type,
        action_value: action_value ?? "10",
        enabled: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, rule });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH — update an existing rule (toggle, rename, execute)
// ──────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const body = await req.json();
    const { id, execute, ...updates } = body;

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    // Verify ownership + fetch rule details for execution
    const { data: existing } = await supabase
      .from("automation_rules")
      .select("id, run_count, condition_type, condition_value, action_type, action_value")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!existing) return NextResponse.json({ error: "Règle introuvable" }, { status: 404 });

    const patch: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };

    let executionMessage = "";
    let affectedCount = 0;

    if (execute) {
      patch.last_run = new Date().toISOString();
      patch.run_count = (existing.run_count ?? 0) + 1;

      const admin = adminClient();

      // Build base product query for this user
      let productQuery = admin
        .from("shopify_products")
        .select("id, title, price, tags, body_html, status, images")
        .eq("user_id", user.id);

      // Apply server-side condition filters where possible
      switch (existing.condition_type) {
        case "price_above":
          productQuery = productQuery.gt("price", existing.condition_value);
          break;
        case "price_below":
          productQuery = productQuery.lt("price", existing.condition_value);
          break;
        case "tag_match":
          productQuery = productQuery.ilike("tags", `%${existing.condition_value}%`);
          break;
        // no_description, no_images, stock_low, stock_zero, scheduled: post-fetch
      }

      const { data: rawProducts } = await productQuery.limit(500);
      let products = rawProducts || [];

      // Post-fetch condition filters
      if (existing.condition_type === "no_description") {
        products = products.filter((p: any) => {
          const html = (p.body_html || "").trim();
          return html === "" || html === "<p></p>" || html === "<p> </p>" || html === "<p><br></p>";
        });
      } else if (existing.condition_type === "no_images") {
        products = products.filter((p: any) => {
          const imgs = p.images;
          return !imgs || (Array.isArray(imgs) && imgs.length === 0) || imgs === "[]";
        });
      }

      affectedCount = products.length;

      if (products.length > 0) {
        const ids = products.map((p: any) => p.id);

        switch (existing.action_type) {
          case "price_increase": {
            const pct = Math.abs(parseFloat(existing.action_value) || 0) / 100;
            for (const p of products as any[]) {
              const cur = parseFloat(p.price) || 0;
              if (cur > 0) {
                await admin.from("shopify_products")
                  .update({ price: (cur * (1 + pct)).toFixed(2) })
                  .eq("id", p.id);
              }
            }
            executionMessage = `${products.length} produit${products.length > 1 ? "s" : ""} — prix +${existing.action_value}%`;
            break;
          }
          case "price_decrease": {
            const pct = Math.abs(parseFloat(existing.action_value) || 0) / 100;
            for (const p of products as any[]) {
              const cur = parseFloat(p.price) || 0;
              if (cur > 0) {
                await admin.from("shopify_products")
                  .update({ price: Math.max(0, cur * (1 - pct)).toFixed(2) })
                  .eq("id", p.id);
              }
            }
            executionMessage = `${products.length} produit${products.length > 1 ? "s" : ""} — prix -${existing.action_value}%`;
            break;
          }
          case "add_tag": {
            let added = 0;
            for (const p of products as any[]) {
              const tagList = p.tags
                ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
                : [];
              if (!tagList.includes(existing.action_value)) {
                await admin.from("shopify_products")
                  .update({ tags: [...tagList, existing.action_value].join(",") })
                  .eq("id", p.id);
                added++;
              }
            }
            executionMessage = `Tag "${existing.action_value}" ajouté à ${added} produit${added > 1 ? "s" : ""}`;
            affectedCount = added;
            break;
          }
          case "remove_tag": {
            let removed = 0;
            for (const p of products as any[]) {
              const tagList = p.tags
                ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
                : [];
              const newTags = tagList.filter((t: string) => t !== existing.action_value).join(",");
              if (p.tags !== newTags) {
                await admin.from("shopify_products").update({ tags: newTags }).eq("id", p.id);
                removed++;
              }
            }
            executionMessage = `Tag "${existing.action_value}" retiré de ${removed} produit${removed > 1 ? "s" : ""}`;
            affectedCount = removed;
            break;
          }
          case "set_status": {
            const newStatus = existing.action_value || "active";
            await admin.from("shopify_products").update({ status: newStatus }).in("id", ids);
            executionMessage = `${products.length} produit${products.length > 1 ? "s" : ""} → statut "${newStatus}"`;
            break;
          }
          case "archive": {
            await admin.from("shopify_products").update({ status: "archived" }).in("id", ids);
            executionMessage = `${products.length} produit${products.length > 1 ? "s" : ""} archivé${products.length > 1 ? "s" : ""}`;
            break;
          }
          case "generate_seo": {
            executionMessage = `${products.length} produit${products.length > 1 ? "s" : ""} prêt${products.length > 1 ? "s" : ""} pour l'optimisation SEO`;
            break;
          }
          case "notify": {
            executionMessage = `${products.length} produit${products.length > 1 ? "s" : ""} concerné${products.length > 1 ? "s" : ""}`;
            break;
          }
          default:
            executionMessage = `${products.length} produit${products.length > 1 ? "s" : ""} traité${products.length > 1 ? "s" : ""}`;
        }
      } else {
        executionMessage = "Aucun produit ne correspond à la condition";
      }
    }

    const { data: rule, error } = await adminClient()
      .from("automation_rules")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({
      success: true,
      rule,
      ...(execute ? { message: executionMessage, affected: affectedCount } : {}),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PUT — legacy alias for PATCH (kept for backward compatibility)
// ──────────────────────────────────────────────────────────────────────────────
export const PUT = PATCH;

// ──────────────────────────────────────────────────────────────────────────────
// DELETE — remove a rule
// ──────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const { error } = await adminClient()
      .from("automation_rules")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
