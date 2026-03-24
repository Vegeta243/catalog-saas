import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { data: userData } = await supabase
      .from("users")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    const { data: referrals } = await supabase
      .from("referrals")
      .select("referred_email, status, created_at, converted_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    const safeReferrals = referrals || [];
    const converted = safeReferrals.filter(r => r.status === "converted").length;
    const domain = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ecompilotelite.com";
    const referralCode = userData?.referral_code || user.id.substring(0, 8);
    const referralUrl = `${domain}/signup?ref=${referralCode}`;

    return NextResponse.json({
      referralCode,
      referralUrl,
      totalReferred: safeReferrals.length,
      converted,
      monthsEarned: converted,
      pendingRewards: safeReferrals.filter(r => r.status === "pending").length,
      referrals: safeReferrals.map(r => ({
        email: r.referred_email,
        status: r.status,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    console.error("[referral/stats]", err);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
