import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { PLAN_TASKS } from "@/lib/credits";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY non configurée.");
  return new Stripe(key, {
    apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion,
  });
}

/** Map a Stripe price ID to a plan name */
function priceIdToPlan(priceId: string): string {
  if (
    priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID
  ) return "pro";
  if (
    priceId === process.env.STRIPE_SCALE_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_SCALE_YEARLY_PRICE_ID
  ) return "scale";
  return "starter";
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Configuration webhook manquante." }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── Idempotency: skip already-processed events ────────────────────────────
    const { data: existing } = await supabase
      .from('processed_webhooks')
      .select('stripe_event_id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // ── checkout.session.completed ────────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email;

      if (email && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0]?.price?.id ?? "";
        const plan = priceIdToPlan(priceId);

        await supabase
          .from("users")
          .update({
            plan,
            actions_limit: PLAN_TASKS[plan] ?? 30,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            subscription_status: "active",
          })
          .eq("email", email);
      }
    }

    // ── customer.subscription.created ────────────────────────────────────────
    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price?.id ?? "";
      const plan = priceIdToPlan(priceId);
      const status = subscription.cancel_at_period_end ? "cancelling" : subscription.status;
      const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

      await supabase
        .from("users")
        .update({
          plan,
          actions_limit: PLAN_TASKS[plan] ?? 30,
          subscription_status: status,
          stripe_subscription_id: subscription.id,
          current_period_end: new Date(periodEnd * 1000).toISOString(),
        })
        .eq("stripe_customer_id", subscription.customer as string);
    }

    // ── customer.subscription.updated ────────────────────────────────────────
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price?.id ?? "";
      const plan = priceIdToPlan(priceId);
      const status = subscription.cancel_at_period_end ? "cancelling" : subscription.status;
      const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

      await supabase
        .from("users")
        .update({
          plan,
          actions_limit: PLAN_TASKS[plan] ?? 30,
          subscription_status: status,
          current_period_end: new Date(periodEnd * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
    }

    // ── invoice.payment_failed ────────────────────────────────────────────────
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as unknown as { subscription: string }).subscription;
      const attemptCount = invoice.attempt_count ?? 0;

      if (subscriptionId) {
        // Mark as past_due immediately
        await supabase
          .from("users")
          .update({ subscription_status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId);

        // After 3 failed attempts, downgrade to free
        if (attemptCount >= 3) {
          await supabase
            .from("users")
            .update({
              plan: "free",
              actions_limit: PLAN_TASKS.free ?? 30,
            })
            .eq("stripe_subscription_id", subscriptionId);
        }
      }
    }

    // ── invoice.payment_succeeded ─────────────────────────────────────────────
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as unknown as { subscription: string }).subscription;

      if (subscriptionId) {
        await supabase
          .from("users")
          .update({ subscription_status: "active" })
          .eq("stripe_subscription_id", subscriptionId);
      }
    }

    // ── customer.subscription.deleted ─────────────────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("users")
        .update({
          plan: "free",
          actions_limit: PLAN_TASKS.free ?? 30,
          stripe_subscription_id: null,
          subscription_status: "canceled",
        })
        .eq("stripe_subscription_id", subscription.id);
    }

    // ── Mark event as processed (idempotency) ─────────────────────────────────
    await supabase
      .from('processed_webhooks')
      .upsert(
        { stripe_event_id: event.id, event_type: event.type },
        { onConflict: 'stripe_event_id', ignoreDuplicates: true }
      );

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
