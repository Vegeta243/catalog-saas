import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY non configurée.");
  return new Stripe(key, {
    apiVersion: "2025-12-18.acacia" as Stripe.LatestApiVersion,
  });
}

export async function POST(req: Request) {
  try {
    const { customerId } = await req.json();

    // Démo mode quand STRIPE_SECRET_KEY n'est pas configuré
    if (!process.env.STRIPE_SECRET_KEY) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      return NextResponse.json({
        url: `${siteUrl}/dashboard/billing?portal=demo`,
        demo: true,
      });
    }

    const stripe = getStripe();

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID manquant." },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
