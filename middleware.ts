import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/cgu', '/politique-confidentialite', '/mentions-legales'];
const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];

export async function middleware(request: NextRequest) {
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
  const pathname = request.nextUrl.pathname;

  // Protected routes: /dashboard/*, /admin/*
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes: check admin email list
  if (pathname.startsWith('/admin') && user) {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    if (!adminEmails.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (authRoutes.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/callback|api/).*)'],
};