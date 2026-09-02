import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import {
  verifiedCurrentAalHeader,
  verifiedEmailHeader,
  verifiedNameHeader,
  verifiedNextAalHeader,
  verifiedRequestHeaders,
  verifiedUserHeader,
} from '@/lib/auth/verified-header';

const accountEntryPaths = new Set(['/sign-in', '/forgot-password']);

function accessTokenAal(accessToken: string | undefined) {
  try {
    const payload = accessToken?.split('.')[1];
    if (!payload) return '';
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
    const decoded = JSON.parse(atob(normalized)) as { aal?: string };
    return decoded.aal === 'aal2'
      ? 'aal2'
      : decoded.aal === 'aal1'
        ? 'aal1'
        : '';
  } catch {
    return '';
  }
}

export async function proxy(request: NextRequest) {
  const config = getSupabasePublicConfig();
  if (!config) return NextResponse.next({ request });

  const forwardedHeaders = new Headers(request.headers);
  verifiedRequestHeaders.forEach((header) => forwardedHeaders.delete(header));
  let applyResponseCookies = (response: NextResponse) => response;
  let response = NextResponse.next({
    request: { headers: forwardedHeaders },
  });
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        const applyEarlierCookies = applyResponseCookies;
        applyResponseCookies = (nextResponse) => {
          applyEarlierCookies(nextResponse);
          cookiesToSet.forEach(({ name, value, options }) =>
            nextResponse.cookies.set(name, value, options),
          );
          return nextResponse;
        };
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentAal = accessTokenAal(session?.access_token);
    const hasVerifiedFactor = Boolean(
      user.factors?.some((factor) => factor.status === 'verified'),
    );
    forwardedHeaders.set(verifiedUserHeader, user.id);
    forwardedHeaders.set(
      verifiedEmailHeader,
      encodeURIComponent(user.email || ''),
    );
    forwardedHeaders.set(
      verifiedNameHeader,
      encodeURIComponent(String(user.user_metadata?.full_name || '')),
    );
    if (currentAal) forwardedHeaders.set(verifiedCurrentAalHeader, currentAal);
    if (hasVerifiedFactor || currentAal)
      forwardedHeaders.set(
        verifiedNextAalHeader,
        hasVerifiedFactor ? 'aal2' : currentAal,
      );
  }

  if (user && accountEntryPaths.has(request.nextUrl.pathname)) {
    return applyResponseCookies(
      NextResponse.redirect(new URL('/', request.url)),
    );
  }

  response = NextResponse.next({ request: { headers: forwardedHeaders } });
  return applyResponseCookies(response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
