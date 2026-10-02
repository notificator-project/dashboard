import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verifyWebflowSignature } from '@/lib/webflow/signature';

function serverSupabase() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

function renderTemplate(template: string, payload: Record<string, unknown>) {
  return template.replace(/{{\s*([^}\s]+)\s*}}/g, (_, path: string) => {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[key];
    }, payload);
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return value.toString();
    }
    return JSON.stringify(value);
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.WEBFLOW_CLIENT_SECRET?.trim();
  if (!secret || !verifyWebflowSignature(rawBody, request.headers.get('x-webflow-timestamp'), request.headers.get('x-webflow-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid Webflow webhook signature' }, { status: 401 });
  }
  try {
    const event = JSON.parse(rawBody) as { triggerType?: string; payload?: Record<string, unknown> };
    const payload = event.payload || {};
    const siteId = typeof payload.siteId === 'string' ? payload.siteId : '';
    if (!siteId) return NextResponse.json({ accepted: true });
    const supabase = serverSupabase();
    const { data: integration } = await supabase
      .from('webflow_integrations')
      .select('id')
      .eq('webflow_site_id', siteId)
      .eq('status', 'connected')
      .maybeSingle();
    if (!integration) return NextResponse.json({ accepted: true });
    const { data: scenario } = await supabase
      .from('webflow_scenarios')
      .select('api_key_id, form_name, title_template, body_template, severity')
      .eq('integration_id', integration.id)
      .eq('trigger_type', event.triggerType || 'form_submission')
      .eq('enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!scenario?.api_key_id || (scenario.form_name && scenario.form_name !== payload.name)) {
      return NextResponse.json({ accepted: true });
    }
    const { data: apiKey } = await supabase
      .from('api_keys')
      .select('key')
      .eq('id', scenario.api_key_id)
      .is('revoked_at', null)
      .maybeSingle();
    if (!apiKey?.key) return NextResponse.json({ error: 'Assigned API key is unavailable' }, { status: 409 });
    const title = renderTemplate(scenario.title_template, payload);
    const body = renderTemplate(scenario.body_template, payload);
    const delivery = await fetch('https://api.notificator-project.com', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey.key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        category: 'webflow',
        severity: scenario.severity,
        source: 'webflow',
        data: event,
        mqttConnection: { mode: 'account' },
      }),
    });
    if (!delivery.ok) return NextResponse.json({ error: 'Notificator delivery failed' }, { status: 502 });
    return NextResponse.json({ accepted: true });
  } catch (error) {
    console.error('Webflow webhook handling failed', error);
    return NextResponse.json({ error: 'Unable to handle Webflow webhook' }, { status: 500 });
  }
}
