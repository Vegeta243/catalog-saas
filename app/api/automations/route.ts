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

/** Resolves the authenticated user from cookie OR Authorization Bearer header */
async function getUser(req: NextRequest) {
  // 1. Try cookie-based auth (standard browser fetch with credentials:include)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  // 2. Fallback: Authorization: Bearer <token> (direct API calls / test scripts)
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const { data } = await adminClient().auth.getUser(token);
    if (data.user) return data.user;
  }
  return null;
}

// GET — list automations for authenticated user
export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const { data: automations, error } = await adminClient()
      .from("automations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ automations: automations ?? [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST — create a new automation
export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const body = await req.json();
    const { name, type, config } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Champs requis manquants (name, type)" }, { status: 400 });
    }

    const validTypes = ["seo", "price", "import", "stock_alert"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    }

    const { data: automation, error } = await adminClient()
      .from("automations")
      .insert({
        user_id: user.id,
        name,
        type,
        config: config ?? {},
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, automation });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// PATCH — update automation (toggle is_active, rename, update config)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    // Whitelist safe update fields
    const safeUpdates: Record<string, unknown> = {};
    if (typeof updates.is_active === "boolean") safeUpdates.is_active = updates.is_active;
    if (typeof updates.name === "string") safeUpdates.name = updates.name;
    if (updates.config !== undefined) safeUpdates.config = updates.config;
    if (updates.last_run_at !== undefined) safeUpdates.last_run_at = updates.last_run_at;
    if (typeof updates.run_count === "number") safeUpdates.run_count = updates.run_count;
    safeUpdates.updated_at = new Date().toISOString();

    const { data: automation, error } = await adminClient()
      .from("automations")
      .update(safeUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, automation });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// DELETE — delete an automation
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const { error } = await adminClient()
      .from("automations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
