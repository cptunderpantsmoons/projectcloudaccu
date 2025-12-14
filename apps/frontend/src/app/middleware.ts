import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/refresh',
];

// Check if the current path is public
function isPublicPath(pathname: string): boolean {
  return publicPaths.some(publicPath => 
    pathname === publicPath || pathname.startsWith(publicPath)
  );
}

// Check if user is authenticated (simple client-side check)
function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  const accessToken = localStorage.getItem('access_token');
  const user = localStorage.getItem('user');
  
  return !!(accessToken && user);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    // If user is authenticated and tries to access login/register, redirect to dashboard
    if ((pathname === '/login' || pathname === '/register') && isAuthenticated()) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (!isAuthenticated()) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};