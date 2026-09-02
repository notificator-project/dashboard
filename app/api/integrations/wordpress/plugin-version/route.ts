import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const pluginInformationUrl =
  'https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=notificator-project';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const response = await fetch(pluginInformationUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw new Error('WordPress.org request failed');
    const payload = (await response.json()) as { version?: unknown };
    if (typeof payload.version !== 'string' || !payload.version.trim())
      throw new Error('WordPress.org returned an invalid version');

    return NextResponse.json(
      { version: payload.version.trim() },
      { headers: { 'cache-control': 'private, max-age=3600' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'Latest plugin version is currently unavailable.' },
      { status: 503 },
    );
  }
}
