import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const allowedKeyTypes = new Set([
  'wordpress_server',
  'strapi_server',
  'public_client',
]);

function createApiKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const value = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `wpnotif_${value.slice(0, 43)}`;
}

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const name =
    typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const keyType = typeof body.keyType === 'string' ? body.keyType : '';
  const rawDomains = Array.isArray(body.domains) ? body.domains : [];
  if (!name)
    return NextResponse.json(
      { error: 'Enter a name for this API key.' },
      { status: 400 },
    );
  if (!allowedKeyTypes.has(keyType))
    return NextResponse.json(
      { error: 'Unsupported API key type.' },
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
  const allowedDomains = [...new Set(domains as string[])];
  const key = createApiKey();
  const { error } = await supabase.from('api_keys').insert({
    user_id: user.id,
    key,
    name,
    key_type: keyType,
    allowed_domains: allowedDomains,
  });
  if (error)
    return NextResponse.json(
      { error: 'The API key could not be created.' },
      { status: 500 },
    );
  return NextResponse.json({ key }, { status: 201 });
}
