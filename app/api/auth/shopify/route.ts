import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Paramètre shop manquant' }, { status: 400 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/shopify/callback`;
  const shopifyAuthUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=read_products,write_products,read_inventory,write_inventory,read_product_listings,read_price_rules,write_price_rules&redirect_uri=${redirectUri}`;

  return NextResponse.redirect(shopifyAuthUrl);
}