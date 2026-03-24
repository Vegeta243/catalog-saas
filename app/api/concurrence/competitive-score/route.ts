import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json();
  const { competitor_id, snapshot } = body;

  if (!competitor_id || !snapshot) {
    return NextResponse.json({ error: "competitor_id et snapshot requis." }, { status: 400 });
  }

  // Verify competitor ownership
  const { data: comp } = await supabase
    .from("competitors")
    .select("name")
    .eq("id", competitor_id)
    .eq("user_id", user.id)
    .single();

  if (!comp) return NextResponse.json({ error: "Concurrent introuvable." }, { status: 404 });

  // Calculate competitive score based on available data
  let score = 50; // baseline
  const breakdown: Record<string, { score: number; label: string }> = {};

  // Products factor (0-25)
  const productsFound = snapshot.products_found || 0;
  const productScore = Math.min(25, Math.round((productsFound / 20) * 25));
  breakdown.products = { score: productScore, label: `${productsFound} produits détectés` };
  score += productScore - 12;

  // SEO factor (0-20)
  let seoScore = 0;
  if (snapshot.seo?.title_tag) seoScore += 8;
  if (snapshot.seo?.has_meta_description) seoScore += 8;
  if ((snapshot.seo?.h1_count || 0) > 0) seoScore += 4;
  breakdown.seo = { score: seoScore, label: seoScore >= 12 ? "SEO bien optimisé" : "SEO perfectible" };
  score += seoScore - 10;

  // Social media presence (0-15)
  const social = snapshot.social || {};
  let socialScore = 0;
  if (social.facebook) socialScore += 5;
  if (social.instagram) socialScore += 5;
  if (social.tiktok) socialScore += 5;
  breakdown.social = { score: socialScore, label: `${Object.values(social).filter(Boolean).length}/3 réseaux` };
  score += socialScore - 7;

  // Payment methods (0-15)
  const payment = snapshot.payment || {};
  let paymentScore = 0;
  if (payment.paypal) paymentScore += 5;
  if (payment.stripe) paymentScore += 5;
  if (payment.klarna) paymentScore += 5;
  breakdown.payment = { score: paymentScore, label: `${Object.values(payment).filter(Boolean).length}/3 méthodes` };
  score += paymentScore - 7;

  // Promotions (bonus/malus)
  if (snapshot.promo_detected) {
    score -= 5; // competing with active promos is harder
    breakdown.promos = { score: -5, label: "Promotions actives (concurrence accrue)" };
  }

  // Recent changes (price drops = malus)
  const priceDrops = (snapshot.price_changes || []).filter(
    (c: { direction?: string }) => c.direction === "down"
  ).length;
  if (priceDrops > 0) {
    score -= priceDrops * 3;
    breakdown.price_changes = { score: -priceDrops * 3, label: `${priceDrops} baisse(s) de prix récentes` };
  }

  // Clamp 0-100
  score = Math.max(0, Math.min(100, score));

  // Threat level
  const threat_level = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
  const threat_label = threat_level === "high" ? "Concurrent fort" : threat_level === "medium" ? "Concurrent modéré" : "Concurrent faible";

  return NextResponse.json({
    competitor: comp.name,
    score,
    threat_level,
    threat_label,
    breakdown,
    summary:
      score >= 70
        ? "Ce concurrent est bien positionné. Analysez ses forces pour adapter votre stratégie."
        : score >= 45
        ? "Concurrent de niveau intermédiaire. Des opportunités existent pour vous différencier."
        : "Ce concurrent présente peu de menace immédiate. Concentrez-vous sur d'autres priorités.",
  });
}
