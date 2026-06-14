import { auth } from '@/auth';

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAuthRoute = nextUrl.pathname === '/login' || nextUrl.pathname === '/register';
  const isPublicRoute = nextUrl.pathname.startsWith('/api/auth') || nextUrl.pathname === '/';

  if (isPublicRoute) {
    return;
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL('/dashboard', nextUrl));
    }
    return;
  }

  if (!req.auth) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return Response.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  // Enforce onboarding checks for authenticated users
  const activeOrgId = req.auth.user?.activeOrgId;
  const isOnboardingRoute = nextUrl.pathname === '/onboarding';

  if (!activeOrgId && !isOnboardingRoute) {
    return Response.redirect(new URL('/onboarding', nextUrl));
  }

  if (activeOrgId && isOnboardingRoute) {
    return Response.redirect(new URL('/dashboard', nextUrl));
  }
});

// Match all routes except static assets
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
