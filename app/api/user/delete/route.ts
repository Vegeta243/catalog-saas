import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await Promise.all([
      admin.from("action_history").delete().eq("user_id", user.id),
      admin.from("import_history").delete().eq("user_id", user.id),
      admin.from("shops").delete().eq("user_id", user.id),
    ]);
    await admin.from("users").delete().eq("id", user.id);
    await admin.auth.admin.deleteUser(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
