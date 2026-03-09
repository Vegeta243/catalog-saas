import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/cgu', '/politique-confidentialite', '/mentions-legales', '/pricing', '/connect'];
const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];

// ── Simple edge-compatible rate limiting ──
const rateLimitMap = new Map<string, { count: number; ts: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX_API = 100;   // API calls per IP per minute

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function isApiRateLimited(ip: string): boolean {
  const now = Date.now();
  const key = `api:${ip}`;
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.ts > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { count: 1, ts: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX_API;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ⚠️ Skip middleware for all admin routes
  // Admin has its own cookie-based auth in app/admin/(protected)/layout.tsx
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // ── Rate limit API routes ──
  if (pathname.startsWith('/api/')) {
    const ip = getIp(request);
    if (isApiRateLimited(ip)) {
      return new NextResponse(JSON.stringify({ error: 'Trop de requêtes. Veuillez réessayer dans une minute.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }
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