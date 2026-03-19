import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data } = await supabase
      .from("users")
      .select("plan, actions_used, actions_limit, actions_reset_at, email, deleted_at")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email || data?.email || "",
        name: user.user_metadata?.first_name || user.email?.split("@")[0] || "",
      },
      plan: data?.plan || "free",
      actions_used: data?.actions_used || 0,
      actions_limit: data?.actions_limit || null,
      actions_reset_at: data?.actions_reset_at || null,
      deleted_at: data?.deleted_at || null,
      workspace: null, // No workspace model — user-centric architecture
    });
  } catch (err) {
    console.error("[user/profile]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
