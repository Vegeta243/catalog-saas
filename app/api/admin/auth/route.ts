import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import crypto from 'crypto'
import { checkAdminLoginRate, createAdminSession, writeAuditLog } from '@/lib/admin-security'

/** Constant-time string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const headerStore = await headers()
  const ip =
    headerStore.get('x-forwarded-for')?.split(',')[0].trim() ||
    headerStore.get('x-real-ip') ||
    'unknown'

  // Rate limit: 5 attempts / 15 min per IP
  const rateCheck = await checkAdminLoginRate(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfterSec) },
      }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { username, email, password } = body as { username?: string; email?: string; password?: string }

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminUsername = process.env.ADMIN_USERNAME

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
  }

  const loginId = username || email || ''
  const isValidUser =
    loginId === adminEmail ||
    (adminUsername && loginId === adminUsername)

  if (!loginId || !password || !isValidUser || !safeCompare(password, adminPassword)) {
    await new Promise((r) => setTimeout(r, 1000))
    await writeAuditLog('anonymous', {
      action: 'admin.login.failed',
      detail: { loginId: loginId.slice(0, 50) },
      ip,
      userAgent: headerStore.get('user-agent') ?? undefined,
    })
    return NextResponse.json({ success: false }, { status: 401 })
  }

  const sessionValue = createAdminSession(adminEmail)

  const cookieStore = await cookies()
  cookieStore.set('admin_session', sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })

  await writeAuditLog(adminEmail, {
    action: 'admin.login.success',
    ip,
    userAgent: headerStore.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  return NextResponse.json({ success: true })
}
