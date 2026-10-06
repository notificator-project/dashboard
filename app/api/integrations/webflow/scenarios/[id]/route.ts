import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptWebflowSecret } from '@/lib/webflow/crypto';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const titleTemplate = typeof body.titleTemplate === 'string' ? body.titleTemplate.trim() : '';
  const bodyTemplate = typeof body.bodyTemplate === 'string' ? body.bodyTemplate.trim() : '';
  const severity = typeof body.severity === 'string' ? body.severity : '';
  const enabled = body.enabled === true || body.enabled === 'on';
  if (!id || !name || !titleTemplate || !bodyTemplate || !['info', 'warning', 'critical'].includes(severity)) {
    return NextResponse.json({ error: 'Scenario name, templates, and severity are required.' }, { status: 400 });
  }
  const { data: current, error: currentError } = await supabase
    .from('webflow_scenarios')
    .select('id, trigger_type, integration_id, webhook_id, form_name')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (currentError || !current) return NextResponse.json({ error: currentError ? 'Unable to load the scenario.' : 'Scenario not found.' }, { status: currentError ? 500 : 404 });
  const requestedIntegrationIds = Array.isArray(body.integrationIds)
    ? body.integrationIds.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [current.integration_id];
  if (!requestedIntegrationIds.length) return NextResponse.json({ error: 'Choose at least one Webflow site.' }, { status: 400 });
  const { data: integrations } = await supabase.from('webflow_integrations').select('id, webflow_site_id, api_key_id').in('id', requestedIntegrationIds).eq('user_id', user.id);
  if (!integrations?.length || integrations.length !== requestedIntegrationIds.length || integrations.some((item) => !item.webflow_site_id || !item.api_key_id)) return NextResponse.json({ error: 'Choose an active API key for every connected Webflow site.' }, { status: 400 });
  const { data: tokenSource } = await supabase.from('webflow_integrations').select('encrypted_access_token').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!tokenSource?.encrypted_access_token) return NextResponse.json({ error: 'Webflow OAuth connection is unavailable. Reconnect Webflow and try again.' }, { status: 400 });
  const accessToken = decryptWebflowSecret(tokenSource.encrypted_access_token);
  const { data: currentAssignments } = await supabase.from('webflow_scenario_sites').select('integration_id, webhook_id').eq('scenario_id', id);
  const existing: Array<{ integration_id: string; webhook_id: string }> = currentAssignments?.length
    ? currentAssignments
    : [{ integration_id: current.integration_id, webhook_id: current.webhook_id || '' }];
  const existingIds = new Set(existing.map((item) => item.integration_id));
  const additions: Array<{ integration_id: string; webhook_id: string }> = [];
  for (const integration of integrations) {
    if (existingIds.has(integration.id)) continue;
    const webhookResponse = await fetch(`https://api.webflow.com/v2/sites/${encodeURIComponent(integration.webflow_site_id!)}/webhooks`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ triggerType: current.trigger_type, url: process.env.WEBFLOW_WEBHOOK_URL?.trim() || new URL('/api/integrations/webflow/webhook', request.url).toString(), ...(current.trigger_type === 'form_submission' && current.form_name ? { filter: { name: current.form_name } } : {}) }),
    });
    const webhook = (await webhookResponse.json()) as { id?: string; message?: string };
    if (!webhookResponse.ok || !webhook.id) {
      const detail = webhook.message || 'Unable to register the scenario for every selected site.';
      const scopeHint = webhookResponse.status === 404 ? ' Reconnect Webflow after granting the sites:write scope, and confirm the site is still authorized.' : '';
      return NextResponse.json({ error: `${detail} (site ${integration.webflow_site_id}).${scopeHint}` }, { status: 502 });
    }
    additions.push({ integration_id: integration.id, webhook_id: webhook.id });
  }
  const selected = [...existing.filter((item) => requestedIntegrationIds.includes(item.integration_id)), ...additions];
  const { data, error } = await supabase
    .from('webflow_scenarios')
    .update({ name, title_template: titleTemplate, body_template: bodyTemplate, severity, enabled, integration_id: selected[0].integration_id, webhook_id: selected[0].webhook_id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, trigger_type, webhook_id, form_name, title_template, body_template, severity, enabled, created_at')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Unable to update the scenario.' }, { status: error ? 500 : 404 });
  await supabase.from('webflow_scenario_sites').delete().eq('scenario_id', id).not('integration_id', 'in', `(${requestedIntegrationIds.join(',')})`);
  const { error: assignmentError } = await supabase.from('webflow_scenario_sites').upsert(selected.map((item) => ({ scenario_id: id, integration_id: item.integration_id, webhook_id: item.webhook_id })), { onConflict: 'scenario_id,integration_id' });
  if (assignmentError) return NextResponse.json({ error: 'Scenario updated, but its site assignments could not be saved.' }, { status: 500 });
  return NextResponse.json({ scenario: { ...data, integration_ids: requestedIntegrationIds } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabase.from('webflow_scenarios').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'Unable to remove the scenario.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
