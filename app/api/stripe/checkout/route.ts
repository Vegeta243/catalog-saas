import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY non configurée. Ajoutez-la dans .env.local");
  return new Stripe(key, {
    apiVersion: "2025-12-18.acacia" as Stripe.LatestApiVersion,
  });
}

const PLANS = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  scale: {
    monthly: process.env.STRIPE_SCALE_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_SCALE_YEARLY_PRICE_ID,
  },
};

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { plan, billing, email, paymentMethod } = await req.json();

    if (!plan || !billing) {
      return NextResponse.json({ error: "Plan ou période manquante." }, { status: 400 });
    }

    const planConfig = PLANS[plan as keyof typeof PLANS];
    if (!planConfig) {
      return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
    }

    const priceId = billing === "yearly" ? planConfig.yearly : planConfig.monthly;
    if (!priceId) {
      return NextResponse.json({ error: "Configuration Stripe incomplète. Ajoutez les Price IDs dans .env.local" }, { status: 500 });
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
        trial_period_days: 7,
        metadata: { plan, billing },
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
