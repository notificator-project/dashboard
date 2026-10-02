import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function currentClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await currentClient();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase
    .from('webflow_integrations')
    .select(
      'id, webflow_site_id, webflow_site_name, api_key_id, status, created_at, updated_at, webflow_scenarios(id, name, trigger_type, webhook_id, form_name, title_template, body_template, severity, enabled, created_at)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Unable to load integrations.' }, { status: 500 });
  return NextResponse.json({ integrations: data || [] }, { headers: { 'cache-control': 'no-store' } });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await currentClient();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const id = typeof body.id === 'string' ? body.id : '';
  const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
  const siteName = typeof body.siteName === 'string' ? body.siteName.trim() : '';
  const apiKeyId = typeof body.apiKeyId === 'string' ? body.apiKeyId.trim() : '';
  if (!id || !siteId || !apiKeyId) return NextResponse.json({ error: 'Choose a Webflow site and API key.' }, { status: 400 });
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('id, key_type')
    .eq('id', apiKeyId)
    .eq('key_type', 'public_client')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .maybeSingle();
  if (!apiKey) return NextResponse.json({ error: 'Choose an active API key owned by this account.' }, { status: 400 });
  const { data, error } = await supabase
    .from('webflow_integrations')
    .update({ webflow_site_id: siteId, webflow_site_name: siteName || null, api_key_id: apiKeyId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, webflow_site_id, webflow_site_name, api_key_id, status')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Unable to save the Webflow site.' }, { status: error ? 500 : 404 });
  return NextResponse.json({ integration: data });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await currentClient();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Integration not found.' }, { status: 400 });
  const { error } = await supabase.from('webflow_integrations').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'Unable to disconnect Webflow.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
