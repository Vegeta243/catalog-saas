import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { importProduct, detectPlatform } from '@/lib/importers'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }
    const body = await request.json()
    const url = (body?.url || '').trim()
    if (!url.startsWith('http')) {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
    }
    const platform = detectPlatform(url)
    const result = await importProduct(url)
    return NextResponse.json({ platform, ...result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur serveur'
    console.error('[preview]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
