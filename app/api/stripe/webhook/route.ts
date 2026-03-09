import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY non configurée.");
  return new Stripe(key, {
    apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion,
  });
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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email;

      if (email) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0]?.price?.id;

        let plan = "starter";
        if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
          plan = "pro";
        } else if (priceId === process.env.STRIPE_SCALE_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_SCALE_YEARLY_PRICE_ID) {
          plan = "scale";
        }

        await supabase
          .from("users")
          .update({
            plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            subscription_status: "active",
          })
          .eq("email", email);
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price?.id;

      let plan = "starter";
      if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
        plan = "pro";
      } else if (priceId === process.env.STRIPE_SCALE_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_SCALE_YEARLY_PRICE_ID) {
        plan = "scale";
      }

      const status = subscription.cancel_at_period_end ? "cancelling" : subscription.status;

      const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

      await supabase
        .from("users")
        .update({
          plan,
          subscription_status: status,
          current_period_end: new Date(periodEnd * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as unknown as { subscription: string }).subscription;

      if (subscriptionId) {
        await supabase
          .from("users")
          .update({ subscription_status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId);
      }
    }

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

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("users")
        .update({ plan: "free", stripe_subscription_id: null, subscription_status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
