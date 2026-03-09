import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = response.headers.get('content-type') || 'image/jpeg'

    return NextResponse.json({ base64: `data:${mimeType};base64,${base64}` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
