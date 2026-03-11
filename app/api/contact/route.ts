import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const SUPPORT_EMAIL = "support@ecompilotelite.com";
const FROM_EMAIL = "EcomPilot <noreply@ecompilotelite.com>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    // Basic validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }
    if (message.length < 10 || message.length > 5000) {
      return NextResponse.json({ error: "Message doit contenir entre 10 et 5000 caractères." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      // Fallback: demo mode (no email service configured)
      return NextResponse.json({ success: true, demo: true });
    }

    const resend = getResend()!;

    // Send notification to support team
    await resend.emails.send({
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `[Support] ${subject}`,
      html: `
        <h2>Nouveau message de contact — EcomPilot</h2>
        <p><strong>Nom :</strong> ${name}</p>
        <p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Sujet :</strong> ${subject}</p>
        <hr />
        <p><strong>Message :</strong></p>
        <p style="white-space: pre-wrap">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        <hr />
        <p style="color: #64748b; font-size: 12px">Envoyé depuis ecompilotelite.com</p>
      `,
    });

    // Send auto-reply to user
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Nous avons bien reçu votre message — EcomPilot",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0f172a">Bonjour ${name},</h2>
          <p>Nous avons bien reçu votre message et y répondrons dans les 24 heures ouvrées.</p>
          <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; color: #374151"><strong>Votre message :</strong></p>
            <p style="margin: 8px 0 0; color: #64748b; white-space: pre-wrap">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>
          <p>En attendant, vous pouvez consulter notre <a href="https://ecompilotelite.com/dashboard/help" style="color: #2563eb">centre d'aide</a> pour trouver des réponses à vos questions.</p>
          <p>L'équipe EcomPilot<br/><a href="mailto:support@ecompilotelite.com">support@ecompilotelite.com</a></p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact email error:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi. Réessayez." }, { status: 500 });
  }
}
