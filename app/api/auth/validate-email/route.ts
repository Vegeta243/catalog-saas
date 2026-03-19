import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ valid: false, reason: "Email invalide" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return NextResponse.json({ valid: false, reason: "Format d'email invalide" });
    }

    const domain = emailLower.split("@")[1];
    if (!domain) {
      return NextResponse.json({ valid: false, reason: "Domaine email manquant" });
    }

    // Check against blocked domains table
    const supabase = await createClient();
    const { data: blocked } = await supabase
      .from("blocked_email_domains")
      .select("domain")
      .eq("domain", domain)
      .single();

    if (blocked) {
      return NextResponse.json({
        valid: false,
        reason: "Les adresses email temporaires ne sont pas acceptées. Veuillez utiliser une adresse email permanente.",
      });
    }

    // Track signup attempt for rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { count } = await supabase
      .from("signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", tenMinutesAgo);

    if ((count || 0) >= 5) {
      return NextResponse.json({
        valid: false,
        reason: "Trop de tentatives d'inscription. Réessayez dans 10 minutes.",
      });
    }

    // Log this attempt
    await supabase.from("signup_attempts").insert({
      email: emailLower,
      ip_address: ip,
    });

    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error("[auth/validate-email]", err);
    // Don't block signup on DB errors — fail open
    return NextResponse.json({ valid: true });
  }
}
