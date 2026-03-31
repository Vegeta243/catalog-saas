import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    // Fetch profile with referral data
    const { data: profile } = await supabase
      .from('users')
      .select('referral_code, referral_count, referral_earnings, email')
      .eq('id', user.id)
      .single()

    // Generate code if missing
    let code = profile?.referral_code
    if (!code || code === '') {
      code = user.id.replace(/-/g, '').slice(0, 8).toUpperCase()
      await supabase.from('users').update({ referral_code: code }).eq('id', user.id)
    }

    // Fetch referred list
    const { data: referrals } = await supabase
      .from('referrals')
      .select('referred_email, status, created_at, converted_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })

    const safeReferrals = referrals || []
    const converted = safeReferrals.filter(r => r.status === 'converted').length
    const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ecompilotelite.com'
    const referralUrl = `${domain}/signup?ref=${code}`
    const shareText = `Essaie EcomPilot Elite pour optimiser ton catalogue Shopify ! Utilise mon lien de parrainage : ${referralUrl}`

    return NextResponse.json({
      referral_code: code,
      referral_url: referralUrl,
      share_text: shareText,
      total_referred: safeReferrals.length,
      converted,
      referral_earnings: profile?.referral_earnings ?? 0,
      referrals: safeReferrals.map(r => ({
        email: r.referred_email,
        status: r.status,
        created_at: r.created_at,
        converted_at: r.converted_at,
      })),
    })
  } catch (e: any) {
    console.error('[GET /api/referral]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const { action, ref_code } = body

    if (action === 'track_signup' && ref_code) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id, referral_count')
        .eq('referral_code', String(ref_code))
        .single()

      if (referrer && referrer.id !== user.id) {
        await supabase
          .from('users')
          .update({ referral_count: (referrer.referral_count || 0) + 1 })
          .eq('id', referrer.id)
        await supabase
          .from('users')
          .update({ referred_by: String(ref_code) })
          .eq('id', user.id)
        // Insert into referrals table
        await supabase.from('referrals').upsert({
          referrer_id: referrer.id,
          referred_email: user.email,
          referral_code: String(ref_code),
          status: 'pending',
        }, { onConflict: 'referrer_id,referred_email', ignoreDuplicates: true })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (e: any) {
    console.error('[POST /api/referral]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
