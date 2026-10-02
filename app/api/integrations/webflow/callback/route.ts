import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { encryptWebflowSecret } from '@/lib/webflow/crypto';

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectBack = new URL('/integrations/webflow?webflow=connected', url.origin);
  const errorBack = new URL('/integrations/webflow?webflow=error', url.origin);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const state = (await cookies()).get('notificator_webflow_oauth_state')?.value;
  const returnedState = url.searchParams.get('state');
  if (!user || !state || !returnedState || state !== returnedState) {
    return NextResponse.redirect(errorBack);
  }

  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(errorBack);
  const redirectUri =
    process.env.WEBFLOW_REDIRECT_URI?.trim() ||
    new URL('/api/integrations/webflow/callback', request.url).toString();
  const tokenResponse = await fetch('https://api.webflow.com/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: required('WEBFLOW_CLIENT_ID'),
      client_secret: required('WEBFLOW_CLIENT_SECRET'),
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });
  const tokenBody = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenResponse.ok || !tokenBody.access_token) {
    console.error('Webflow OAuth token exchange failed', tokenBody.error);
    return NextResponse.redirect(errorBack);
  }

  const { error } = await supabase.from('webflow_integrations').insert({
    user_id: user.id,
    encrypted_access_token: encryptWebflowSecret(tokenBody.access_token),
  });
  if (error) {
    console.error('Unable to save Webflow integration', error.message);
    return NextResponse.redirect(errorBack);
  }
  const response = NextResponse.redirect(redirectBack);
  response.cookies.delete('notificator_webflow_oauth_state');
  return response;
}
