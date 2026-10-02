import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptWebflowSecret } from '@/lib/webflow/crypto';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: integration, error } = await supabase
    .from('webflow_integrations')
    .select('id, encrypted_access_token')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !integration) return NextResponse.json({ sites: [] });
  let response: Response;
  try {
    response = await fetch('https://api.webflow.com/v2/sites', {
      headers: { accept: 'application/json', authorization: `Bearer ${decryptWebflowSecret(integration.encrypted_access_token)}` },
    });
  } catch (error) {
    console.error('Unable to request Webflow sites', error);
    const detail = error instanceof Error ? error.message : '';
    const encryptionFailure = detail.includes('WEBFLOW_ENCRYPTION_KEY') || detail.includes('Unsupported state') || detail.includes('unable to authenticate data');
    return NextResponse.json({ error: encryptionFailure
      ? 'Unable to load Webflow sites. Local WEBFLOW_ENCRYPTION_KEY does not match the key used to save this connection.'
      : 'Unable to load Webflow sites. The saved Webflow connection could not be decrypted or reached.' }, { status: 502 });
  }
  const rawBody = await response.text();
  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }
  if (!response.ok) {
    const detail = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : `Webflow returned ${response.status}.`;
    return NextResponse.json({ error: `Unable to load Webflow sites: ${detail}` }, { status: 502 });
  }
  const sites = body && typeof body === 'object' && 'sites' in body && Array.isArray(body.sites)
    ? body.sites
    : Array.isArray(body) ? body : [];
  return NextResponse.json({ integrationId: integration.id, sites });
}
