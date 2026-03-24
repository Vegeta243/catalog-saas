import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY non configurée. Ajoutez-la dans .env.local");
  return new Stripe(key, {
    apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion,
  });
}

// Fallback price IDs from .env.vercel.tmp if env vars are missing
const PLANS = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || process.env.STRIPE_STARTER_PRICE_ID || 'price_1T9VIXE2Eg0XD50YQi7QKGLB',
    yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || 'price_1T9VKWE2Eg0XD50YE2m1yXN9',
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID || 'price_1T7LdlE2Eg0XD50YKywVBHL6',
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_1T9VMcE2Eg0XD50YO0ixnQDF',
  },
  scale: {
    monthly: process.env.STRIPE_SCALE_MONTHLY_PRICE_ID || process.env.STRIPE_SCALE_PRICE_ID || 'price_1T9VNQE2Eg0XD50YAKmjHx0y',
    yearly: process.env.STRIPE_SCALE_YEARLY_PRICE_ID || 'price_1T9VOaE2Eg0XD50YaBrW4E7P',
  },
};

export async function POST(req: Request) {
  try {
    // Require authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const { plan, billing, email, paymentMethod } = await req.json();

    if (!plan || !billing) {
      return NextResponse.json({ error: "Plan ou période manquante." }, { status: 400 });
    }

    // Démo mode quand STRIPE_SECRET_KEY n'est pas configuré
    if (!process.env.STRIPE_SECRET_KEY) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      return NextResponse.json({
        url: `${siteUrl}/dashboard/billing?checkout=success&demo=true&plan=${plan}`,
        demo: true,
      });
    }

    const stripe = getStripe();

    const planConfig = PLANS[plan as keyof typeof PLANS];
    if (!planConfig) {
      return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
    }

    const priceId = billing === "yearly" ? planConfig.yearly : planConfig.monthly;
    if (!priceId) {
      return NextResponse.json({ error: `Plan invalide: ${plan}` }, { status: 400 });
    }

    // Support multiple payment methods (card + PayPal if enabled)
    const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ["card"];
    if (paymentMethod === "paypal" || process.env.STRIPE_PAYPAL_ENABLED === "true") {
      paymentMethodTypes.push("paypal");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: paymentMethodTypes,
      customer_email: email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?checkout=cancel`,
      subscription_data: {
        metadata: { plan, billing },
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      // automatic_tax requires Stripe Tax to be activated in the dashboard
      ...(process.env.STRIPE_TAX_ENABLED === "true" ? { automatic_tax: { enabled: true } } : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
