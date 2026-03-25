import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const db = getAdminClient()
  const { data } = await db
    .from('site_config')
    .select('value')
    .eq('key', 'demo_video_url')
    .single()

  return NextResponse.json({
    url: (data?.value as string) || null,
  })
}

export async function POST(request: NextRequest) {
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('video') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }

  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Fichier trop grand (max 100MB)' },
      { status: 400 }
    )
  }

  const db = getAdminClient()
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split('.').pop() || 'mp4'
  const fileName = `demo-video.${ext}`

  const { error: uploadError } = await db.storage
    .from('demo-video')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = db.storage
    .from('demo-video')
    .getPublicUrl(fileName)

  await db
    .from('site_config')
    .upsert({ key: 'demo_video_url', value: urlData.publicUrl }, { onConflict: 'key' })

  return NextResponse.json({ url: urlData.publicUrl })
}

export async function DELETE() {
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getAdminClient()

  await db.storage.from('demo-video').remove(['demo-video.mp4', 'demo-video.webm', 'demo-video.mov'])

  await db
    .from('site_config')
    .upsert({ key: 'demo_video_url', value: '' }, { onConflict: 'key' })

  return NextResponse.json({ ok: true })
}
