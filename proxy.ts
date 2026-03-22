import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/cgu', '/politique-confidentialite', '/mentions-legales', '/pricing', '/connect'];
const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];

// Pages only accessible by admin
const ADMIN_ONLY_PATHS = [
  '/dashboard/recherche-ia',
  '/dashboard/import',
  '/dashboard/creation-boutique',
];

// API routes only accessible by admin
const ADMIN_ONLY_API_PATHS = [
  '/api/products/ai-search',
  '/api/import',
  '/api/stores/design-ai',
];

/**
 * Verify admin_session token using Web Crypto API (Edge Runtime compatible).
 */
async function verifyAdminSessionEdge(token: string): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET_KEY || '';
  const adminEmail = process.env.ADMIN_EMAIL || '';
  if (!secret || !adminEmail) return false;
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob(padded);
    const dotIdx = raw.lastIndexOf('.');
    if (dotIdx < 0) return false;
    const payload = raw.slice(0, dotIdx);
    const sigHex = raw.slice(dotIdx + 1);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    if (sigHex.length % 2 !== 0) return false;
    const sigBytes = new Uint8Array(sigHex.length / 2);
    for (let i = 0; i < sigBytes.length; i++) {
      sigBytes[i] = parseInt(sigHex.slice(i * 2, i * 2 + 2), 16);
    }
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload));
    if (!valid) return false;
    const colonIdx = payload.lastIndexOf(':');
    if (colonIdx < 0) return false;
    const email = payload.slice(0, colonIdx);
    const timestamp = Number(payload.slice(colonIdx + 1));
    if (isNaN(timestamp) || Date.now() - timestamp > 8 * 60 * 60 * 1000) return false;
    return email === adminEmail;
  } catch {
    return false;
  }
}

// ── Rate limiting is handled at the route level (lib/rate-limit.ts → Supabase-backed) ──
// No in-memory rate limiting in middleware (would be non-functional in serverless).


export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ⚠️ Skip middleware for all admin routes
  // Admin has its own cookie-based auth in app/admin/(protected)/layout.tsx
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // ── Admin-only route guard ──
  const isAdminOnlyPath = ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p));
  const isAdminOnlyApi = ADMIN_ONLY_API_PATHS.some(p => pathname.startsWith(p));
  if (isAdminOnlyPath || isAdminOnlyApi) {
    const adminToken = request.cookies.get('admin_session');
    if (!adminToken?.value) {
      if (isAdminOnlyApi) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    const isValid = await verifyAdminSessionEdge(adminToken.value);
    if (!isValid) {
      if (isAdminOnlyApi) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  const { createServerClient } = await import('@supabase/ssr');
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes: /dashboard/*
  const isProtected = pathname.startsWith('/dashboard');
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (authRoutes.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/callback).*)'],
};

export default function proxy(request: NextRequest) {
  return middleware(request);
}