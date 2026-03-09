import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log-action";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    await supabase.from("users").update({
      deleted_at: null,
      deletion_scheduled_at: null,
    }).eq("id", user.id);

    await logAction(supabase, {
      userId: user.id,
      actionType: "account.recovered",
      description: "Compte récupéré par l'utilisateur",
    });

    return NextResponse.json({ success: true, redirect: "/dashboard" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
