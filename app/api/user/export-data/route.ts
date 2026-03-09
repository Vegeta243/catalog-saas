import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const [userData, shops, history] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase.from("shops").select("*").eq("user_id", user.id),
      supabase.from("action_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: { email: user.email, ...userData.data },
      shops: shops.data || [],
      history: history.data || [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ecompilot-export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
