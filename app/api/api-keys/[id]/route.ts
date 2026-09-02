import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function normalizeDomain(value: unknown) {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toLowerCase();
  if (!raw || raw.length > 253) return null;
  try {
    const hostname = new URL(
      raw.includes('://') ? raw : `https://${raw}`,
    ).hostname
      .replace(/^www\./, '')
      .toLowerCase();
    return /^[a-z0-9.-]+$/.test(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('api_keys')
    .select('key')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: 'The API key could not be loaded.' },
      { status: 500 },
    );
  if (!data?.key)
    return NextResponse.json(
      { error: 'Only active API keys can be revealed.' },
      { status: 404 },
    );
  return NextResponse.json(
    { key: data.key },
    { headers: { 'cache-control': 'no-store' } },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const name =
    typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const rawDomains = Array.isArray(body.domains) ? body.domains : [];
  if (!name)
    return NextResponse.json(
      { error: 'Enter a name for this API key.' },
      { status: 400 },
    );
  if (rawDomains.length > 25)
    return NextResponse.json(
      { error: 'Use no more than 25 allowed domains.' },
      { status: 400 },
    );
  const domains = rawDomains.map(normalizeDomain);
  if (domains.some((domain) => !domain))
    return NextResponse.json(
      { error: 'One or more allowed domains are invalid.' },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from('api_keys')
    .update({
      name,
      allowed_domains: [...new Set(domains as string[])],
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: 'The API key could not be updated.' },
      { status: 500 },
    );
  if (!data)
    return NextResponse.json(
      { error: 'Only active API keys can be edited.' },
      { status: 409 },
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .not('revoked_at', 'is', null)
    .select('id')
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: 'The API key could not be deleted.' },
      { status: 500 },
    );
  if (!data)
    return NextResponse.json(
      { error: 'Revoke this API key before deleting it.' },
      { status: 409 },
    );
  return NextResponse.json({ ok: true });
}
