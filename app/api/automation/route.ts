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

    // Verify ownership first
    const { data: existing } = await supabase
      .from("automation_rules")
      .select("id, run_count")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!existing) return NextResponse.json({ error: "Règle introuvable" }, { status: 404 });

    const patch: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
    if (execute) {
      patch.last_run = new Date().toISOString();
      patch.run_count = (existing.run_count ?? 0) + 1;
    }

    const { data: rule, error } = await adminClient()
      .from("automation_rules")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, rule });
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
