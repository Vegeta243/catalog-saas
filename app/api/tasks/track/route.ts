import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { ACTION_COSTS } from "@/lib/credits";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const body = await req.json();
    const taskType: string = body.task_type || "generic";
    const cost = ACTION_COSTS[taskType] ?? 1;

    // Rate limit check
    const rateResult = await checkRateLimit(user.id, "ai.generate");
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans quelques instants." },
        { status: 429 }
      );
    }

    // Fetch current usage (with potential reset)
    const { data: userData } = await supabase
      .from("users")
      .select("actions_used, actions_limit, actions_reset_at, plan")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const now = new Date();
    const resetAt = userData.actions_reset_at ? new Date(userData.actions_reset_at) : null;
    let currentUsed = userData.actions_used || 0;

    // Auto-reset if month has passed
    if (resetAt && resetAt <= now) {
      await supabase
        .from("users")
        .update({
          actions_used: 0,
          actions_reset_at: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
        })
        .eq("id", user.id);
      currentUsed = 0;
    }

    const limit = userData.actions_limit || 30;

    if (currentUsed + cost > limit) {
      return NextResponse.json(
        {
          error: "limit_exceeded",
          message: "Vous avez atteint votre limite de tâches ce mois. Passez à un plan supérieur pour continuer.",
          used: currentUsed,
          limit,
          plan: userData.plan || "free",
        },
        { status: 429 }
      );
    }

    // Increment
    const { data: rpcResult } = await supabase.rpc("increment_actions", {
      p_user_id: user.id,
      p_count: cost,
    });

    const newUsed = typeof rpcResult === "number" ? rpcResult : currentUsed + cost;

    return NextResponse.json({
      success: true,
      used: newUsed,
      limit,
      remaining: Math.max(0, limit - newUsed),
      task_type: taskType,
      cost,
    });
  } catch (e) {
    console.error("[tasks/track]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
