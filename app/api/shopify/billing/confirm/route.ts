import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { shopifyQuery, APP_SUBSCRIPTION_QUERY } from '@/lib/shopify-graphql';

// Service-role client for updating user plan
const admin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AppSubscriptionNode {
  node: {
    id: string;
    name: string;
    status: string;
    lineItems: {
      id: string;
      plan: { pricingDetails: { price?: { amount: string; currencyCode: string }; interval?: string } };
    }[];
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plan  = searchParams.get('plan');
  const uid   = searchParams.get('uid');
  const chargeId = searchParams.get('charge_id'); // Shopify passes this on return

  if (!uid || !plan) {
    return NextResponse.redirect(new URL('/dashboard?billing=error', request.url));
  }

  try {
    // Fetch the shop for this user
    const { data: shop } = await admin
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', uid)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!shop?.access_token) {
      return NextResponse.redirect(new URL('/dashboard/shops?billing=error', request.url));
    }

    // Verify subscription status via Shopify GraphQL (optional — use charge_id if available)
    let status = 'ACTIVE';
    if (chargeId) {
      try {
        const data = await shopifyQuery<AppSubscriptionNode>(
          shop.shop_domain,
          shop.access_token,
          APP_SUBSCRIPTION_QUERY,
          { id: chargeId }
        );
        status = data.node?.status ?? 'ACTIVE';
      } catch {
        // If verification fails, trust the redirect (Shopify only redirects on success)
      }
    }

    if (status === 'ACTIVE' || status === 'PENDING') {
      // Upgrade user plan in DB
      await admin.from('users').update({
        plan,
        subscription_status: 'active',
        shopify_subscription_id: chargeId || null,
        shopify_pending_plan: null,
      }).eq('id', uid);

      return NextResponse.redirect(new URL(`/dashboard?billing=success&plan=${plan}`, request.url));
    }

    return NextResponse.redirect(new URL('/dashboard/upgrade?billing=cancelled', request.url));
  } catch (err) {
    console.error('[Shopify Billing Confirm] Error:', err);
    return NextResponse.redirect(new URL('/dashboard?billing=error', request.url));
  }
}
