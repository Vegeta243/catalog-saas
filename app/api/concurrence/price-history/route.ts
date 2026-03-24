import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const competitor_id = searchParams.get("competitor_id");
  const limit = parseInt(searchParams.get("limit") || "100");

  let query = supabase
    .from("competitor_price_history")
    .select("*")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: true })
    .limit(limit);

  if (competitor_id) query = query.eq("competitor_id", competitor_id);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return NextResponse.json({ history: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ history: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json();
  const { competitor_id, products } = body;

  if (!competitor_id || !Array.isArray(products) || products.length === 0) {
    return NextResponse.json({ error: "competitor_id et products requis." }, { status: 400 });
  }

  // Verify the competitor belongs to this user
  const { data: comp } = await supabase
    .from("competitors")
    .select("id")
    .eq("id", competitor_id)
    .eq("user_id", user.id)
    .single();

  if (!comp) return NextResponse.json({ error: "Concurrent introuvable." }, { status: 404 });

  const rows = products
    .filter((p: { product_name?: string; price?: number }) => p.product_name && typeof p.price === "number")
    .map((p: { product_name: string; price: number; currency?: string }) => ({
      user_id: user.id,
      competitor_id,
      product_name: p.product_name,
      price: p.price,
      currency: p.currency || "EUR",
    }));

  if (rows.length === 0) return NextResponse.json({ saved: 0 });

  const { error } = await supabase.from("competitor_price_history").insert(rows);
  if (error) {
    if (error.code === "42P01") return NextResponse.json({ saved: 0, setup_required: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: rows.length });
}
