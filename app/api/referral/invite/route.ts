import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    // Don't invite yourself
    if (emailLower === user.email?.toLowerCase()) {
      return NextResponse.json({ error: "Vous ne pouvez pas vous inviter vous-même" }, { status: 400 });
    }

    // Check for duplicate pending invite
    const { data: existing } = await supabase
      .from("referrals")
      .select("id, status")
      .eq("referrer_id", user.id)
      .eq("referred_email", emailLower)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Une invitation a déjà été envoyée à cet email" }, { status: 409 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    const referralCode = userData?.referral_code || user.id.substring(0, 8);
    const domain = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ecompilotelite.com";
    const referralUrl = `${domain}/signup?ref=${referralCode}`;

    // Record the invite
    await supabase.from("referrals").insert({
      referrer_id: user.id,
      referred_email: emailLower,
      referral_code: referralCode,
      status: "pending",
    });

    // Send invitation email via Resend
    if (process.env.RESEND_API_KEY) {
      const inviterName = user.email?.split("@")[0] ?? "Un utilisateur";
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "EcomPilot Elite <onboarding@resend.dev>",
          to: emailLower,
          subject: `${inviterName} vous invite à rejoindre EcomPilot`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #e2e8f0">
              <h2 style="color:#0f172a;margin-bottom:8px">Vous avez été invité !</h2>
              <p style="color:#64748b;line-height:1.6">
                <strong>${inviterName}</strong> vous invite à utiliser <strong>EcomPilot</strong> — la plateforme d'optimisation de boutique en ligne par IA.
              </p>
              <div style="margin:24px 0;text-align:center">
                <a href="${referralUrl}" style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                  Créer mon compte gratuitement
                </a>
              </div>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px">
                En vous inscrivant via ce lien, vous et votre parrain bénéficiez d'avantages exclusifs.<br>
                Lien d'invitation : <a href="${referralUrl}" style="color:#2563eb">${referralUrl}</a>
              </p>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true, referralUrl });
  } catch (err) {
    console.error("[referral/invite]", err);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
