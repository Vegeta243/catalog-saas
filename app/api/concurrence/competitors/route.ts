import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("competitors")
    .select("*, competitor_snapshots(id, analyzed_at, products_found, avg_price, price_changes, new_products, removed_products)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return NextResponse.json({ competitors: [], setup_required: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ competitors: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, url } = body;
  if (!name || !url) return NextResponse.json({ error: "Nom et URL requis." }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "URL invalide." }, { status: 400 });
  }

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
        sql_file: "supabase/migrations/004_new_tables.sql"
      }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ competitor: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
