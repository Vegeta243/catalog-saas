import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function genCode(uid: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seed = uid.replace(/-/g, '').slice(0, 8)
  let code = 'EP'
  for (let i = 0; i < 6; i++) code += chars[parseInt(seed[i] || '0', 16) % chars.length]
  return code
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('referral_code, referral_count, referral_earnings, email')
      .eq('id', user.id)
      .single()

    let code = userData?.referral_code
    if (!code || code === '') {
      code = genCode(user.id)
      await supabase.from('users').update({ referral_code: code }).eq('id', user.id)
    }

    const { data: referrals } = await supabase
      .from('referrals')
      .select('id, referred_id, referral_code, status, created_at, converted_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })

    const safeReferrals = referrals || []
    const total = safeReferrals.length
    const converted = safeReferrals.filter(r => r.status === 'converted').length
    const pending = total - converted

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ecompilotelite.com'
    const referralUrl = `${siteUrl}/signup?ref=${code}`

    return NextResponse.json({
      code,
      referralUrl,
      shareText: `Essaie EcomPilot Elite pour optimiser ton catalogue Shopify ! Utilise mon lien de parrainage : ${referralUrl}`,
      stats: {
        total,
        converted,
        pending,
        rewardPerReferral: '1 mois offert',
        earnings: userData?.referral_earnings ?? 0,
      },
      referrals: safeReferrals.map(r => ({
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        convertedAt: r.converted_at,
        email: null, // fetched from auth.users separately if needed
      })),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[GET /api/referral]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { code, action } = body

    // Track signup via referral code
    if (action === 'track_signup' || code) {
      const refCode = (code || body.ref_code || '').toUpperCase()
      if (!refCode) return NextResponse.json({ error: 'Code requis' }, { status: 400 })

      const { data: referrer } = await supabase
        .from('users')
        .select('id, referral_count')
        .eq('referral_code', refCode)
        .single()

      if (!referrer) return NextResponse.json({ error: 'Code invalide' }, { status: 404 })
      if (user && referrer.id === user.id) return NextResponse.json({ error: 'Code invalide' }, { status: 400 })

      const { data: referral, error: insertErr } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrer.id,
          referred_id: user?.id || null,
          referral_code: refCode,
          status: 'pending',
        })
        .select()
        .single()

      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

      if (user) {
        await supabase.from('users').update({ referred_by: referrer.id }).eq('id', user.id)
      }

      return NextResponse.json({ success: true, referral })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
