import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

function sanitizeDomain(input: string): string {
  let s = input.trim().toLowerCase();
  // Strip protocol
  s = s.replace(/^https?:\/\//, '');
  // Extract from admin.shopify.com/store/SLUG
  const adminMatch = s.match(/admin\.shopify\.com\/store\/([a-z0-9][a-z0-9-]*)/);
  if (adminMatch) return `${adminMatch[1]}.myshopify.com`;
  // Already slug.myshopify.com
  const myshopifyMatch = s.match(/^([a-z0-9][a-z0-9-]*)\.myshopify\.com/);
  if (myshopifyMatch) return `${myshopifyMatch[1]}.myshopify.com`;
  // Bare slug
  const slug = s.split('/')[0].split('?')[0].replace(/\s/g, '');
  if (/^[a-z0-9][a-z0-9-]*$/.test(slug)) return `${slug}.myshopify.com`;
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopInput, accessToken } = body as { shopInput: string; accessToken: string };

    if (!shopInput || !accessToken) {
      return NextResponse.json({ error: 'Domaine et token requis.' }, { status: 400 });
    }

    const shopDomain = sanitizeDomain(shopInput);
    if (!shopDomain) {
      return NextResponse.json({ error: 'Domaine Shopify invalide.' }, { status: 400 });
    }

    // Validate token by calling the Shopify API
    const shopRes = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!shopRes.ok) {
      if (shopRes.status === 401) {
        return NextResponse.json({ error: 'Token invalide ou accès refusé. Vérifiez votre token API.' }, { status: 401 });
      }
      if (shopRes.status === 404) {
        return NextResponse.json({ error: 'Boutique introuvable. Vérifiez le domaine.' }, { status: 404 });
      }
      return NextResponse.json({ error: `Erreur Shopify (${shopRes.status}). Vérifiez le domaine et le token.` }, { status: 400 });
    }

    const { shop: shopData } = await shopRes.json();
    const shopName = shopData?.name || shopDomain;

    // Get authenticated user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    let userId: string | null = null;
    try {
      const response = NextResponse.next();
      const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });
      const { data: { user } } = await supabaseAuth.auth.getUser();
      userId = user?.id || null;
    } catch { /* try without user */ }

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié. Connectez-vous d\'abord.' }, { status: 401 });
    }

    // Save to Supabase
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabaseAdmin
      .from('shops')
      .upsert(
        {
          user_id: userId,
          shop_domain: shopDomain,
          shop_name: shopName,
          access_token: accessToken,
          is_active: true,
          scopes: 'manual_token',
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: 'shop_domain' }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: `Erreur base de données: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, shop: { id: data.id, shop_domain: shopDomain, shop_name: shopName } });
  } catch (err) {
    console.error('save-token error:', err);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
