import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shopifyQuery, ShopifyTokenExpiredError, APP_SUBSCRIPTION_CREATE } from '@/lib/shopify-graphql';

const PLANS: Record<string, { name: string; price: number; interval: 'EVERY_30_DAYS' | 'ANNUAL' }> = {
  starter: { name: 'EcomPilot Starter', price: 19.0, interval: 'EVERY_30_DAYS' },
  pro:     { name: 'EcomPilot Pro',     price: 49.0, interval: 'EVERY_30_DAYS' },
  scale:   { name: 'EcomPilot Scale',   price: 129.0, interval: 'EVERY_30_DAYS' },
};

interface AppSubscriptionData {
  appSubscriptionCreate: {
    appSubscription: { id: string; status: string } | null;
    confirmationUrl: string | null;
    userErrors: { field: string[]; message: string }[];
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

    const body = await req.json();
    const planKey = (body.plan as string)?.toLowerCase();

    if (!planKey || !(planKey in PLANS)) {
      return NextResponse.json({ error: 'Plan invalide. Valeurs acceptées : starter, pro, scale.' }, { status: 400 });
    }

    const plan = PLANS[planKey];

    // Get connected Shopify shop
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (shopError || !shop?.access_token) {
      return NextResponse.json({ error: 'Boutique Shopify non connectée.' }, { status: 400 });
    }
    const { shop_domain, access_token } = shop;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ecompilotelite.com';
    const returnUrl = `${siteUrl}/api/shopify/billing/confirm?plan=${planKey}&uid=${user.id}`;

    const isTest = process.env.NODE_ENV !== 'production';

    const data = await shopifyQuery<AppSubscriptionData>(
      shop_domain,
      access_token,
      APP_SUBSCRIPTION_CREATE,
      {
        name: plan.name,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: plan.price, currencyCode: 'EUR' },
                interval: plan.interval,
              },
            },
          },
        ],
        returnUrl,
        test: isTest,
      }
    );

    const { appSubscriptionCreate } = data;

    if (appSubscriptionCreate.userErrors.length > 0) {
      return NextResponse.json(
        { error: appSubscriptionCreate.userErrors.map((e) => e.message).join('; ') },
        { status: 422 }
      );
    }

    if (!appSubscriptionCreate.confirmationUrl) {
      return NextResponse.json({ error: "Pas d'URL de confirmation reçue de Shopify" }, { status: 500 });
    }

    // Store pending subscription in DB
    const subscriptionId = appSubscriptionCreate.appSubscription?.id;
    if (subscriptionId) {
      await supabase.from('users').update({
        shopify_subscription_id: subscriptionId,
        shopify_pending_plan: planKey,
      }).eq('id', user.id);
    }

    return NextResponse.json({ confirmationUrl: appSubscriptionCreate.confirmationUrl });
  } catch (err) {
    if (err instanceof ShopifyTokenExpiredError) {
      return NextResponse.json({
        error: 'Votre connexion Shopify a expiré. Veuillez reconnecter votre boutique.',
        code: 'SHOPIFY_TOKEN_EXPIRED',
        reconnect_url: '/dashboard/shops',
      }, { status: 401 });
    }
    console.error('[Shopify Billing] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
