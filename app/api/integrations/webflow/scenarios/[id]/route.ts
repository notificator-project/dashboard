import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  const { data, error } = await supabase
    .from('webflow_scenarios')
    .update({ name, title_template: titleTemplate, body_template: bodyTemplate, severity, enabled, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, trigger_type, webhook_id, form_name, title_template, body_template, severity, enabled, created_at')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Unable to update the scenario.' }, { status: error ? 500 : 404 });
  return NextResponse.json({ scenario: data });
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
