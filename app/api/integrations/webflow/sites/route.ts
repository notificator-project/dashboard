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
  const response = await fetch('https://api.webflow.com/v2/sites', {
    headers: { accept: 'application/json', authorization: `Bearer ${decryptWebflowSecret(integration.encrypted_access_token)}` },
  });
  const body = await response.json();
  if (!response.ok) return NextResponse.json({ error: 'Unable to load Webflow sites.' }, { status: 502 });
  return NextResponse.json({ integrationId: integration.id, sites: body.sites || body });
}
