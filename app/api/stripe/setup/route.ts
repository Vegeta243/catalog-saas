/**
 * POST /api/stripe/setup
 * Creates all Stripe products + prices for EcomPilot plans.
 * Run once after adding STRIPE_SECRET_KEY to .env.local.
 * Returns the Price IDs to copy into your .env.local.
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";

const PLANS = [
  { id: "starter", name: "EcomPilot Starter", monthly: 4900, yearly: 3900 },
  { id: "pro",     name: "EcomPilot Pro",     monthly: 8900, yearly: 6900 },
  { id: "scale",   name: "EcomPilot Scale",   monthly: 12900, yearly: 9900 },
];

export async function POST(req: Request) {
  // Require admin secret to prevent abuse
  const { secret } = await req.json().catch(() => ({}));
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    // Allow if no SETUP_SECRET configured (local dev)
    if (process.env.SETUP_SECRET) {
      return NextResponse.json({ error: "Accès refusé — SETUP_SECRET requis." }, { status: 403 });
    }
  }

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith("sk_test_REMPLACER")) {
    return NextResponse.json({
      error: "STRIPE_SECRET_KEY non configurée. Ajoutez votre clé Stripe dans .env.local",
      help: "https://dashboard.stripe.com/test/apikeys",
    }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-18.acacia" as Stripe.LatestApiVersion,
  });

  const result: Record<string, Record<string, string>> = {};

  for (const plan of PLANS) {
    // Create or retrieve product
    let product: Stripe.Product;
    const existing = await stripe.products.search({ query: `metadata['plan_id']:'${plan.id}'`, limit: 1 });
    if (existing.data.length > 0) {
      product = existing.data[0];
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: `EcomPilot ${plan.name.replace("EcomPilot ", "")} — Gestion catalogue Shopify par IA`,
        metadata: { plan_id: plan.id },
      });
    }

    // Create monthly price
    const monthlyPrices = await stripe.prices.list({ product: product.id, lookup_keys: [`${plan.id}_monthly`] });
    let monthlyPrice: Stripe.Price;
    if (monthlyPrices.data.length > 0) {
      monthlyPrice = monthlyPrices.data[0];
    } else {
      monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthly,
        currency: "eur",
        recurring: { interval: "month" },
        lookup_key: `${plan.id}_monthly`,
        metadata: { plan: plan.id, period: "monthly" },
      });
    }

    // Create yearly price
    const yearlyPrices = await stripe.prices.list({ product: product.id, lookup_keys: [`${plan.id}_yearly`] });
    let yearlyPrice: Stripe.Price;
    if (yearlyPrices.data.length > 0) {
      yearlyPrice = yearlyPrices.data[0];
    } else {
      yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.yearly * 12,
        currency: "eur",
        recurring: { interval: "year" },
        lookup_key: `${plan.id}_yearly`,
        metadata: { plan: plan.id, period: "yearly" },
      });
    }

    result[plan.id] = {
      monthly_price_id: monthlyPrice.id,
      yearly_price_id: yearlyPrice.id,
      product_id: product.id,
    };
  }

  // Generate the .env.local snippet
  const envSnippet = `
# Copiez ces lignes dans votre .env.local :
STRIPE_STARTER_MONTHLY_PRICE_ID=${result.starter.monthly_price_id}
STRIPE_STARTER_YEARLY_PRICE_ID=${result.starter.yearly_price_id}
STRIPE_PRO_MONTHLY_PRICE_ID=${result.pro.monthly_price_id}
STRIPE_PRO_YEARLY_PRICE_ID=${result.pro.yearly_price_id}
STRIPE_SCALE_MONTHLY_PRICE_ID=${result.scale.monthly_price_id}
STRIPE_SCALE_YEARLY_PRICE_ID=${result.scale.yearly_price_id}
  `.trim();

  return NextResponse.json({
    success: true,
    message: "Produits et prix Stripe créés avec succès.",
    prices: result,
    env_snippet: envSnippet,
  });
}

export async function GET() {
  return NextResponse.json({
    info: "Endpoint POST /api/stripe/setup — crée les produits Stripe.",
    configured: !!(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith("sk_test_REMPLACER")),
    prices_configured: !!(
      process.env.STRIPE_STARTER_MONTHLY_PRICE_ID &&
      !process.env.STRIPE_STARTER_MONTHLY_PRICE_ID.startsWith("price_REMPLACER")
    ),
  });
}
