import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { email, password } = body as { email?: string; password?: string }

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
  }

  if (!email || !password || email !== adminEmail || password !== adminPassword) {
    // Constant-time-ish delay to slow brute force
    await new Promise((r) => setTimeout(r, 1000))
    return NextResponse.json({ success: false }, { status: 401 })
  }

  const sessionValue = Buffer.from(`${email}:${Date.now()}`).toString('base64')

  const cookieStore = await cookies()
  cookieStore.set('admin_session', sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  return NextResponse.json({ success: true })
}
