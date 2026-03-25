import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { importProduct, detectPlatform } from '@/lib/importers'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  let body: { url?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requete invalide' }, { status: 400 })
  }

  const { url } = body
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
  }

  const platform = detectPlatform(url)
  const result = await importProduct(url)

  return NextResponse.json({ platform, ...result })
}
