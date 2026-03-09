import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { username, email, password } = body as { username?: string; email?: string; password?: string }

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminUsername = process.env.ADMIN_USERNAME

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
  }

  // Accept login by username OR email
  const loginId = username || email || ''
  const isValidUser =
    loginId === adminEmail ||
    (adminUsername && loginId === adminUsername)

  if (!loginId || !password || !isValidUser || password !== adminPassword) {
    // Constant-time-ish delay to slow brute force
    await new Promise((r) => setTimeout(r, 1000))
    return NextResponse.json({ success: false }, { status: 401 })
  }

  // Always embed the admin email in the session token (not the username)
  const sessionValue = Buffer.from(`${adminEmail}:${Date.now()}`).toString('base64')

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
