import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptWebflowSecret } from '@/lib/webflow/crypto';

const supportedTriggerTypes = new Set([
  'form_submission',
  'site_publish',
  'page_created',
  'page_metadata_updated',
  'page_deleted',
  'ecomm_new_order',
  'ecomm_order_changed',
  'ecomm_inventory_changed',
  'collection_item_created',
  'collection_item_changed',
  'collection_item_deleted',
  'collection_item_published',
  'collection_item_unpublished',
  'comment_created',
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const integrationId = typeof body.integrationId === 'string' ? body.integrationId : '';
  const integrationIds = Array.isArray(body.integrationIds)
    ? body.integrationIds.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : integrationId ? [integrationId] : [];
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const triggerType = typeof body.triggerType === 'string' ? body.triggerType : 'form_submission';
  if (!integrationIds.length || !name) return NextResponse.json({ error: 'Choose at least one Webflow site and enter a scenario name.' }, { status: 400 });
  if (!supportedTriggerTypes.has(triggerType)) return NextResponse.json({ error: 'Unsupported Webflow trigger type.' }, { status: 400 });
  const { data: integrations } = await supabase.from('webflow_integrations').select('id, webflow_site_id, encrypted_access_token, api_key_id').in('id', integrationIds).eq('user_id', user.id);
  if (!integrations?.length || integrations.length !== integrationIds.length || integrations.some((item) => !item.webflow_site_id || !item.api_key_id)) return NextResponse.json({ error: 'Choose an active API key for every connected Webflow site.' }, { status: 400 });
  const webhookUrl = process.env.WEBFLOW_WEBHOOK_URL?.trim() || new URL('/api/integrations/webflow/webhook', request.url).toString();
  const registered: Array<{ integrationId: string; webhookId: string }> = [];
  for (const integration of integrations) {
    const webhookResponse = await fetch(`https://api.webflow.com/v2/sites/${encodeURIComponent(integration.webflow_site_id!)}/webhooks`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${decryptWebflowSecret(integration.encrypted_access_token)}` },
      body: JSON.stringify({ triggerType, url: webhookUrl, ...(triggerType === 'form_submission' && typeof body.formName === 'string' && body.formName.trim() ? { filter: { name: body.formName.trim() } } : {}) }),
    });
    const webhook = (await webhookResponse.json()) as { id?: string; message?: string };
    if (!webhookResponse.ok || !webhook.id) return NextResponse.json({ error: webhook.message || 'Unable to register the Webflow webhook for every selected site.' }, { status: 502 });
    registered.push({ integrationId: integration.id, webhookId: webhook.id });
  }
  const { data, error } = await supabase.from('webflow_scenarios').insert({
    user_id: user.id,
    integration_id: registered[0].integrationId,
    name,
    trigger_type: triggerType,
    webhook_id: registered[0].webhookId,
    form_name: triggerType === 'form_submission' && typeof body.formName === 'string' ? body.formName.trim() || null : null,
    title_template: typeof body.titleTemplate === 'string' && body.titleTemplate.trim() ? body.titleTemplate.trim() : 'New Webflow form submission',
    body_template: typeof body.bodyTemplate === 'string' && body.bodyTemplate.trim() ? body.bodyTemplate.trim() : 'A new form was submitted on your Webflow site.',
    severity: ['info', 'warning', 'critical'].includes(String(body.severity)) ? body.severity : 'info',
  }).select('id, name, trigger_type, webhook_id, form_name, title_template, body_template, severity, enabled, created_at').single();
  if (error) return NextResponse.json({ error: 'Webhook registered, but the scenario could not be saved.' }, { status: 500 });
  const { error: assignmentError } = await supabase.from('webflow_scenario_sites').insert(registered.map((item) => ({ scenario_id: data.id, integration_id: item.integrationId, webhook_id: item.webhookId })));
  if (assignmentError) return NextResponse.json({ error: 'Scenario saved, but its site assignments could not be saved.' }, { status: 500 });
  return NextResponse.json({ scenario: { ...data, integration_ids: registered.map((item) => item.integrationId) } }, { status: 201 });
}
