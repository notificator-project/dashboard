import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/sign-in', request.url));

  const state = randomBytes(32).toString('hex');
  const redirectUri =
    process.env.WEBFLOW_REDIRECT_URI?.trim() ||
    new URL('/api/integrations/webflow/callback', request.url).toString();
  const authorize = new URL('https://webflow.com/oauth/authorize');
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', required('WEBFLOW_CLIENT_ID'));
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set(
    'scope',
    process.env.WEBFLOW_SCOPES || 'sites:read sites:write forms:read cms:read',
  );
  authorize.searchParams.set('state', state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set('notificator_webflow_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/integrations/webflow',
    maxAge: 600,
  });
  return response;
}
