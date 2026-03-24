import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const competitor_id = searchParams.get("competitor_id");

  let query = supabase
    .from("competitor_alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (competitor_id) query = query.eq("competitor_id", competitor_id);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return NextResponse.json({ alerts: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alerts: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json();
  const { competitor_id, alert_type, threshold_value, frequency, notification_method } = body;

  if (!alert_type) return NextResponse.json({ error: "alert_type requis." }, { status: 400 });

  const VALID_TYPES = ["price_drop", "price_increase", "new_product", "out_of_stock", "seo_change"];
  if (!VALID_TYPES.includes(alert_type)) {
    return NextResponse.json({ error: "alert_type invalide." }, { status: 400 });
  }

  const VALID_FREQ = ["immediate", "daily", "weekly"];
  const VALID_METHODS = ["email", "dashboard", "both"];

  const { data, error } = await supabase
    .from("competitor_alerts")
    .insert({
      user_id: user.id,
      competitor_id: competitor_id || null,
      alert_type,
      threshold_value: threshold_value ?? null,
      frequency: VALID_FREQ.includes(frequency) ? frequency : "daily",
      notification_method: VALID_METHODS.includes(notification_method) ? notification_method : "email",
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ error: "Table manquante.", setup_required: true }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alert: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  const { error } = await supabase
    .from("competitor_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id, is_active } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  const { data, error } = await supabase
    .from("competitor_alerts")
    .update({ is_active })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ alert: data });
}
