import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const SUPPORT_EMAIL = "support@ecompilotelite.com";
const FROM_EMAIL = "EcomPilot <noreply@ecompilotelite.com>";

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  message: z.string().min(20).max(5000),
  category: z.enum(["general", "billing", "technical", "shopify", "ai", "other"]).default("general"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const rl = checkRateLimit(user.id, "default");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un moment." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const parsed = createTicketSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { subject, message, category } = parsed.data;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: ticket, error } = await admin
    .from("support_tickets")
    .insert({ user_id: user.id, subject, message, category })
    .select()
    .single();

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({
        error: "Table manquante. Exécutez supabase/migrations/012_support.sql dans Supabase SQL Editor.",
        setup_required: true,
      }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send email notification (non-blocking)
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    resend.emails.send({
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      subject: `[Support #${ticket.id.slice(0, 8)}] ${subject}`,
      html: `<p><strong>Utilisateur :</strong> ${user.email}</p>
<p><strong>Catégorie :</strong> ${category}</p>
<p><strong>Message :</strong></p>
<p>${message.replace(/\n/g, "<br>")}</p>`,
    }).catch(() => { /* non-fatal */ });

    resend.emails.send({
      from: FROM_EMAIL,
      to: user.email!,
      subject: `Votre demande a été reçue (#${ticket.id.slice(0, 8)})`,
      html: `<p>Bonjour,</p>
<p>Nous avons bien reçu votre demande concernant : <strong>${subject}</strong>.</p>
<p>Notre équipe vous répondra dans les 24-48h ouvrables.</p>
<p>— L'équipe EcomPilot</p>`,
    }).catch(() => { /* non-fatal */ });
  }

  return NextResponse.json({ ticket }, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*, support_ticket_replies(id, author_role, message, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ tickets: [], setup_required: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tickets: data || [] });
}
