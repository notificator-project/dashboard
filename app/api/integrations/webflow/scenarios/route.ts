import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptWebflowSecret } from '@/lib/webflow/crypto';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const integrationId = typeof body.integrationId === 'string' ? body.integrationId : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  if (!integrationId || !name) return NextResponse.json({ error: 'Integration and scenario name are required.' }, { status: 400 });
  const { data: integration } = await supabase.from('webflow_integrations').select('id, webflow_site_id, encrypted_access_token, api_key_id').eq('id', integrationId).eq('user_id', user.id).maybeSingle();
  if (!integration?.webflow_site_id || !integration.api_key_id) return NextResponse.json({ error: 'Choose an active API key for the connected Webflow site first.' }, { status: 400 });
  const webhookResponse = await fetch(`https://api.webflow.com/v2/sites/${encodeURIComponent(integration.webflow_site_id)}/webhooks`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${decryptWebflowSecret(integration.encrypted_access_token)}` },
    body: JSON.stringify({
      triggerType: 'form_submission',
      url: process.env.WEBFLOW_WEBHOOK_URL?.trim() || new URL('/api/integrations/webflow/webhook', request.url).toString(),
      ...(typeof body.formName === 'string' && body.formName.trim() ? { filter: { name: body.formName.trim() } } : {}),
    }),
  });
  const webhook = (await webhookResponse.json()) as { id?: string; message?: string };
  if (!webhookResponse.ok || !webhook.id) return NextResponse.json({ error: webhook.message || 'Unable to register the Webflow webhook.' }, { status: 502 });
  const { data, error } = await supabase.from('webflow_scenarios').insert({
    user_id: user.id,
    integration_id: integrationId,
    name,
    webhook_id: webhook.id,
    form_name: typeof body.formName === 'string' ? body.formName.trim() || null : null,
    title_template: typeof body.titleTemplate === 'string' && body.titleTemplate.trim() ? body.titleTemplate.trim() : 'New Webflow form submission',
    body_template: typeof body.bodyTemplate === 'string' && body.bodyTemplate.trim() ? body.bodyTemplate.trim() : 'A new form was submitted on your Webflow site.',
    severity: ['info', 'warning', 'critical'].includes(String(body.severity)) ? body.severity : 'info',
  }).select('id, name, webhook_id, form_name, title_template, body_template, severity, enabled, created_at').single();
  if (error) return NextResponse.json({ error: 'Webhook registered, but the scenario could not be saved.' }, { status: 500 });
  return NextResponse.json({ scenario: data }, { status: 201 });
}
