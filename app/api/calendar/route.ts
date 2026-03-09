import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type");

  let query = supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user.id)
    .order("scheduled_at", { ascending: true });

  if (from) query = query.gte("scheduled_at", from);
  if (to) query = query.lte("scheduled_at", to);
  if (type && type !== "all") query = query.eq("event_type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json();
  const { title, description, event_type, scheduled_at, product_ids, action_params, repeat } = body;

  if (!title || !event_type || !scheduled_at) {
    return NextResponse.json({ error: "Titre, type et date requis." }, { status: 400 });
  }

  const { data, error } = await supabase.from("calendar_events").insert({
    user_id: user.id,
    title,
    description: description || "",
    event_type,
    scheduled_at,
    product_ids: product_ids || [],
    action_params: { ...(action_params || {}), repeat: repeat || "never" },
  }).select().single();

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

  return NextResponse.json({ event: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id, status, completed_at } = await request.json();
  if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (completed_at) updates.completed_at = completed_at;

  const { error } = await supabase
    .from("calendar_events")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
