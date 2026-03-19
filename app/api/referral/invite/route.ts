import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const domain = process.env.NEXT_PUBLIC_APP_URL || "https://catalog-saas.vercel.app";
    const referralUrl = `${domain}/signup?ref=${referralCode}`;

    // Record the invite
    await supabase.from("referrals").insert({
      referrer_id: user.id,
      referred_email: emailLower,
      referral_code: referralCode,
      status: "pending",
    });

    // Send email via Supabase (basic notification — in production use Resend/SendGrid)
    // For now we just record it; email sending can be done via a Supabase function or Resend
    console.log(`[referral/invite] Invite to ${emailLower} with URL: ${referralUrl}`);

    return NextResponse.json({ success: true, referralUrl });
  } catch (err) {
    console.error("[referral/invite]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
