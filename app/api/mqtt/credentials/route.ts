import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeCredentials } from '@/lib/mqtt/credentials';
import {
  accountStorageConfigured,
  decryptCredentials,
  encryptCredentials,
} from '@/lib/mqtt/encryption';

export const dynamic = 'force-dynamic';
const table = 'user_mqtt_credentials';
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff',
    },
  });

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// No CORS access: session cookies and a same-origin request are required for writes.
function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return (
    origin === new URL(request.url).origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
  );
}

export async function GET() {
  const { supabase, user } = await session();
  if (!user) return reply({ error: 'Unauthorized' }, 401);
  const { data, error } = await supabase
    .from(table)
    .select('encrypted_credentials')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error)
    return reply(
      {
        error:
          'Account MQTT storage is unavailable. You can still save for this session.',
      },
      503,
    );
  const available = accountStorageConfigured();
  if (!data) return reply({ credentials: null, saved: false, available });
  try {
    const credentials = normalizeCredentials(
      decryptCredentials(user.id, data.encrypted_credentials),
    );
    return reply({ credentials, saved: true, available });
  } catch {
    // Keep the account copy removable even when its encryption key is unavailable.
    return reply({
      credentials: null,
      saved: true,
      available,
      error:
        'Saved credentials could not be restored. Re-enter and save them, or remove the account copy.',
    });
  }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request))
    return reply({ error: 'Request origin not allowed.' }, 403);
  const { supabase, user } = await session();
  if (!user) return reply({ error: 'Unauthorized' }, 401);
  if (!accountStorageConfigured())
    return reply(
      {
        error:
          'Account MQTT storage is not configured. Save for this session instead.',
      },
      503,
    );
  let credentials;
  try {
    const raw = await request.text();
    if (raw.length > 8000)
      return reply({ error: 'MQTT settings are too large.' }, 400);
    credentials = normalizeCredentials(JSON.parse(raw));
  } catch (error) {
    return reply(
      {
        error:
          error instanceof SyntaxError
            ? 'Invalid MQTT settings.'
            : error instanceof Error
              ? error.message
              : 'Invalid MQTT settings.',
      },
      400,
    );
  }
  const { error } = await supabase.from(table).upsert(
    {
      user_id: user.id,
      encrypted_credentials: encryptCredentials(user.id, {
        version: 1,
        provider: 'hivemq_cloud',
        ...credentials,
      }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  // Database diagnostics must not leak the encrypted or plaintext payload.
  if (error)
    return reply(
      {
        error:
          'Credentials could not be saved to your account. Please try again.',
      },
      503,
    );
  return reply({ saved: true });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return reply({ error: 'Request origin not allowed.' }, 403);
  const { supabase, user } = await session();
  if (!user) return reply({ error: 'Unauthorized' }, 401);
  const { error } = await supabase.from(table).delete().eq('user_id', user.id);
  if (error)
    return reply(
      { error: 'The account copy could not be removed. Please try again.' },
      503,
    );
  return reply({ saved: false });
}
