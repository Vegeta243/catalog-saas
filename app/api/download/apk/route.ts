import { NextResponse } from 'next/server'

const APK_URL =
  'https://github.com/Vegeta243/catalog-saas/releases/latest/download/EcomPilotElite-v1.0.apk'

export async function GET() {
  try {
    const response = await fetch(APK_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        Accept: 'application/octet-stream',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'APK not available' }, { status: 404 })
    }

    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="EcomPilotElite.apk"',
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
