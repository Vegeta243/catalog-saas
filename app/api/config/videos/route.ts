import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const db = getClient()
  const { data } = await db
    .from('site_config')
    .select('key, value')
    .in('key', ['landing_hero_video_url', 'landing_beforeafter_video_url'])

  const map: Record<string, string | null> = {
    hero: null,
    beforeafter: null,
  }
  for (const row of data || []) {
    if (row.key === 'landing_hero_video_url') map.hero = (row.value as string) || null
    if (row.key === 'landing_beforeafter_video_url') map.beforeafter = (row.value as string) || null
  }

  return NextResponse.json(map, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
  })
}
