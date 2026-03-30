import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'landing-videos'
const SLOT_KEYS: Record<string, string> = {
  hero: 'landing_hero_video_url',
  beforeafter: 'landing_beforeafter_video_url',
}

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function validSlot(slot: string | null): slot is 'hero' | 'beforeafter' {
  return slot === 'hero' || slot === 'beforeafter'
}

export async function GET(request: NextRequest) {
  const slot = request.nextUrl.searchParams.get('slot')
  if (!validSlot(slot)) {
    return NextResponse.json({ error: 'Slot invalide (hero | beforeafter)' }, { status: 400 })
  }
  const db = getAdminClient()
  const { data } = await db
    .from('site_config')
    .select('value')
    .eq('key', SLOT_KEYS[slot])
    .single()
  return NextResponse.json({ url: (data?.value as string) || null })
}

export async function POST(request: NextRequest) {
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const slot = formData.get('slot') as string | null
  const file = formData.get('video') as File | null

  if (!validSlot(slot)) {
    return NextResponse.json({ error: 'Slot invalide (hero | beforeafter)' }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > 200 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop grand (max 200MB)' }, { status: 400 })
  }

  const db = getAdminClient()
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split('.').pop() || 'mp4'
  const fileName = `${slot}-video.${ext}`

  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(fileName)

  await db
    .from('site_config')
    .upsert({ key: SLOT_KEYS[slot], value: urlData.publicUrl }, { onConflict: 'key' })

  return NextResponse.json({ url: urlData.publicUrl })
}

export async function DELETE(request: NextRequest) {
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const slot = request.nextUrl.searchParams.get('slot')
  if (!validSlot(slot)) {
    return NextResponse.json({ error: 'Slot invalide (hero | beforeafter)' }, { status: 400 })
  }

  const db = getAdminClient()

  // Remove from storage (try, ignore errors)
  const { data: files } = await db.storage.from(BUCKET).list('')
  const target = files?.find((f: { name: string }) => f.name.startsWith(`${slot}-video.`))
  if (target) {
    await db.storage.from(BUCKET).remove([target.name])
  }

  // Remove config row
  await db.from('site_config').delete().eq('key', SLOT_KEYS[slot])

  return NextResponse.json({ ok: true })
}
