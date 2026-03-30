import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/admin-security";

const FROM_EMAIL = "EcomPilot Elite <noreply@ecompilotelite.com>";

const replySchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().min(1).max(5000),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");
  if (!adminSession?.value) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const session = await verifyAdminSession(adminSession.value);
  if (!session.valid) return NextResponse.json({ error: "Session invalide." }, { status: 401 });

  const parsed = replySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { ticketId, message, status } = parsed.data;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: replyError } = await admin
    .from("support_ticket_replies")
    .insert({ ticket_id: ticketId, author_role: "admin", message });

  if (replyError) return NextResponse.json({ error: replyError.message }, { status: 500 });

  if (status) {
    await admin
      .from("support_tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", ticketId);
  }

  // Send email to user
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("subject, user_id, users(email)")
    .eq("id", ticketId)
    .single();

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && ticket) {
    const userEmail = (ticket.users as { email?: string } | null)?.email;
    if (userEmail) {
      const resend = new Resend(apiKey);
      resend.emails.send({
        from: FROM_EMAIL,
        to: userEmail,
        subject: `Réponse à votre demande : ${ticket.subject}`,
        html: `<p>L'équipe EcomPilot a répondu à votre demande :</p>
<blockquote>${message.replace(/\n/g, "<br>")}</blockquote>
<p>Connectez-vous à <a href="https://app.ecompilotelite.com/dashboard/help">votre espace aide</a> pour voir la conversation complète.</p>`,
      }).catch(() => { /* non-fatal */ });
    }
  }

  return NextResponse.json({ success: true });
}
