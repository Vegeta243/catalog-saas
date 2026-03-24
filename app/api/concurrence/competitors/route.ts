import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const createCompetitorSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data, error } = await supabase
    .from("competitors")
    .select("*, competitor_snapshots(id, analyzed_at, products_found, avg_price, price_changes, new_products, removed_products, raw_data)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return NextResponse.json({ competitors: [], setup_required: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const competitors = (data || []).map(c => {
    const snap = c.competitor_snapshots?.[0];
    if (!snap) return { ...c, competitor_snapshots: undefined, snapshot: null };
    const { raw_data, ...snapFields } = snap as Record<string, unknown> & { raw_data?: Record<string, unknown> };
    return {
      ...c,
      competitor_snapshots: undefined,
      snapshot: { ...snapFields, ...(raw_data || {}) },
    };
  });

  return NextResponse.json({ competitors });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "default");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un moment." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const parsed = createCompetitorSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { name, url } = parsed.data;

  const platform = url.includes("myshopify") ? "shopify"
    : url.includes("woocommerce") || url.includes("wp-content") ? "woocommerce"
    : "other";

  const { data, error } = await supabase
    .from("competitors")
    .insert({ user_id: user.id, name, url, shop_platform: platform })
    .select()
    .single();

  if (error) {
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return NextResponse.json({
        error: "Table manquante. Exécutez supabase/migrations/004_new_tables.sql dans Supabase SQL Editor.",
        setup_required: true,
        sql_file: "supabase/migrations/004_new_tables.sql",
      }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ competitor: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });

  const { error } = await supabase
    .from("competitors")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
