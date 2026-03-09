import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log-action";

// GET — list alerts for the user's competitors
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  // Get the user's competitors
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name, url")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!competitors || competitors.length === 0) {
    return NextResponse.json({ alerts: [] });
  }

  const competitorIds = competitors.map(c => c.id);

  // Get latest 2 snapshots per competitor to detect changes
  const { data: snapshots } = await supabase
    .from("competitor_snapshots")
    .select("competitor_id, products_found, avg_price, price_changes, new_products, removed_products, analyzed_at")
    .in("competitor_id", competitorIds)
    .order("analyzed_at", { ascending: false })
    .limit(competitorIds.length * 2);

  const alerts: {
    competitor_id: string;
    competitor_name: string;
    type: "price_change" | "new_product" | "removed_product";
    message: string;
    severity: "low" | "medium" | "high";
    detected_at: string;
  }[] = [];

  const competitorMap = Object.fromEntries(competitors.map(c => [c.id, c.name]));

  // Find the most recent snapshot per competitor and extract alerts
  const seen = new Set<string>();
  for (const snap of snapshots || []) {
    if (seen.has(snap.competitor_id)) continue;
    seen.add(snap.competitor_id);

    const name = competitorMap[snap.competitor_id] || "Concurrent";
    const priceChanges = (snap.price_changes as { title: string; oldPrice: number; newPrice: number }[]) || [];
    const newProducts = (snap.new_products as string[]) || [];
    const removedProducts = (snap.removed_products as string[]) || [];

    for (const change of priceChanges.slice(0, 3)) {
      const pct = Math.abs(((change.newPrice - change.oldPrice) / change.oldPrice) * 100);
      alerts.push({
        competitor_id: snap.competitor_id,
        competitor_name: name,
        type: "price_change",
        message: `${name} a modifié le prix de "${change.title}" : ${change.oldPrice}€ → ${change.newPrice}€ (${pct.toFixed(1)}%)`,
        severity: pct >= 20 ? "high" : pct >= 10 ? "medium" : "low",
        detected_at: snap.analyzed_at,
      });
    }

    if (newProducts.length > 0) {
      alerts.push({
        competitor_id: snap.competitor_id,
        competitor_name: name,
        type: "new_product",
        message: `${name} a ajouté ${newProducts.length} nouveau${newProducts.length > 1 ? "x" : ""} produit${newProducts.length > 1 ? "s" : ""} : ${newProducts.slice(0, 2).join(", ")}${newProducts.length > 2 ? "..." : ""}`,
        severity: newProducts.length >= 5 ? "high" : "medium",
        detected_at: snap.analyzed_at,
      });
    }

    if (removedProducts.length > 0) {
      alerts.push({
        competitor_id: snap.competitor_id,
        competitor_name: name,
        type: "removed_product",
        message: `${name} a retiré ${removedProducts.length} produit${removedProducts.length > 1 ? "s" : ""} : ${removedProducts.slice(0, 2).join(", ")}${removedProducts.length > 2 ? "..." : ""}`,
        severity: "low",
        detected_at: snap.analyzed_at,
      });
    }
  }

  // Sort by severity then date
  const severityOrder = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return NextResponse.json({ alerts });
}

// POST — dismiss/acknowledge an alert (mark snapshot as acknowledged)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json();
  const { competitor_id } = body;
  if (!competitor_id) return NextResponse.json({ error: "competitor_id requis." }, { status: 400 });

  // Verify ownership
  const { data: competitor } = await supabase
    .from("competitors")
    .select("id")
    .eq("id", competitor_id)
    .eq("user_id", user.id)
    .single();

  if (!competitor) return NextResponse.json({ error: "Concurrent introuvable." }, { status: 404 });

  // Mark latest snapshot as acknowledged
  const { data: latestSnap } = await supabase
    .from("competitor_snapshots")
    .select("id")
    .eq("competitor_id", competitor_id)
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .single();

  if (latestSnap) {
    await supabase
      .from("competitor_snapshots")
      .update({ acknowledged: true })
      .eq("id", latestSnap.id);
  }

  await logAction(supabase, {
    userId: user.id,
    actionType: "competitor.alert.dismiss",
    description: `Alertes concurrent ignorées`,
    creditsUsed: 0,
  });

  return NextResponse.json({ ok: true });
}
