import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import crypto from 'crypto'
import {
  checkAdminLoginRate,
  createAdminSession,
  invalidateAdminSession,
  writeAuditLog,
} from '@/lib/admin-security'
import { logSecurityEvent } from '@/lib/security-logger'

/**
 * Constant-time string comparison — always compares full 256-byte windows
 * so response time doesn't reveal password length.
 */
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const aBuf = Buffer.alloc(256);
    const bBuf = Buffer.alloc(256);
    aBuf.write(a, 0, 256, 'utf8');
    bBuf.write(b, 0, 256, 'utf8');
    const lengthsMatch = a.length === b.length;
    const contentsMatch = crypto.timingSafeEqual(aBuf, bBuf);
    return lengthsMatch && contentsMatch;
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
  const userAgent = headerStore.get('user-agent') ?? undefined

  // Two-tier rate limit: 5/15min (warning) + 15/1h (lockout)
  const rateCheck = await checkAdminLoginRate(ip)
  if (!rateCheck.allowed) {
    await logSecurityEvent('admin_login_rate_limited', 'warning', {
      ipAddress: ip,
      userAgent,
      extra: { lockedOut: rateCheck.lockedOut },
    })
    return NextResponse.json(
      {
        error: rateCheck.lockedOut
          ? 'Trop de tentatives. Compte verrouillé pendant 1 heure.'
          : 'Trop de tentatives. Réessayez dans quelques minutes.',
      },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSec) } }
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
    // Fixed 1 s delay regardless of which check failed (prevents user enumeration)
    await new Promise((r) => setTimeout(r, 1000))
    await Promise.all([
      logSecurityEvent('admin_login_failure', 'warning', {
        ipAddress: ip,
        userAgent,
        extra: { loginId: loginId.slice(0, 50) },
      }),
      writeAuditLog('anonymous', {
        action: 'admin.login.failed',
        detail: { loginId: loginId.slice(0, 50) },
        ip,
        userAgent,
      }),
    ])
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

  await Promise.all([
    logSecurityEvent('admin_login_success', 'info', { ipAddress: ip, userAgent }),
    writeAuditLog(adminEmail, { action: 'admin.login.success', ip, userAgent }),
  ])

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_session')?.value

  // Blacklist the token so it cannot be replayed even if intercepted
  if (token) {
    await invalidateAdminSession(token)
  }

  cookieStore.delete('admin_session')
  return NextResponse.json({ success: true })
}
