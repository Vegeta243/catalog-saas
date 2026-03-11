import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logAction } from "@/lib/log-action";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Soft delete: mark user for deletion in 30 days
    await admin.from("users").update({
      deleted_at: new Date().toISOString(),
      deletion_scheduled_at: scheduledAt,
    }).eq("id", user.id);

    await logAction(admin, {
      userId: user.id,
      actionType: "account.soft_delete",
      description: "Compte marqué pour suppression dans 30 jours",
      details: { scheduled_deletion: scheduledAt },
    });

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: "Compte marqué pour suppression dans 30 jours." });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Hard delete — used from account-recovery confirmation
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const parsed = z.object({ confirm: z.literal("DELETE_NOW") }).safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Confirmation requise." }, { status: 400 });
    }

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
