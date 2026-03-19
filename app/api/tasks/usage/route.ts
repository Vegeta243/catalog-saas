import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLAN_TASKS } from "@/lib/credits";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("users")
      .select("plan, actions_used, actions_limit, actions_reset_at")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const plan = data.plan || "free";
    const used = data.actions_used || 0;
    const limit = data.actions_limit || PLAN_TASKS[plan] || 30;

    // Compute next reset date (1st of next month)
    const now = new Date();
    const resetAt = data.actions_reset_at
      ? new Date(data.actions_reset_at)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    // If reset date is past, the count will reset on next action
    const effectiveUsed = resetAt <= now ? 0 : used;

    return NextResponse.json({
      used: effectiveUsed,
      limit,
      plan,
      resets_at: resetAt.toISOString(),
      percentage: limit > 0 ? Math.round((effectiveUsed / limit) * 100) : 0,
    });
  } catch (e) {
    console.error("[tasks/usage]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
