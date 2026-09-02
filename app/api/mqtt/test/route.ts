import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const defaultApiUrl =
  'https://wpnotif.notificator-project.com/.netlify/functions/wpnotif-api';

function normalizeMqttConfig(body: Record<string, unknown>) {
  const host = (typeof body.host === 'string' ? body.host : '')
    .trim()
    .toLowerCase()
    .replace(/^wss:\/\//, '')
    .replace(/:\d+.*$/, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
  const username =
    typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const topicPrefix = (
    typeof body.topicPrefix === 'string'
      ? body.topicPrefix
      : 'notificator-project'
  )
    .trim()
    .replace(/^\/+|\/+$/g, '');

  if (!host.endsWith('.hivemq.cloud') || !/^[a-z0-9.-]+$/.test(host))
    throw new Error('Enter a valid HiveMQ Cloud cluster hostname.');
  const hasControlCharacters = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code < 32 || code === 127) return true;
    }
    return false;
  };
  if (!username || username.length > 128 || hasControlCharacters(username))
    throw new Error('Enter a valid HiveMQ username.');
  if (!password || password.length > 512 || hasControlCharacters(password))
    throw new Error('Enter a valid HiveMQ password.');
  if (
    !topicPrefix ||
    topicPrefix.length > 128 ||
    !/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(topicPrefix)
  )
    throw new Error(
      'Use letters, numbers, dots, dashes, underscores, or slashes in the topic prefix.',
    );

  return {
    version: 1,
    provider: 'hivemq_cloud',
    host,
    port: 8884,
    path: '/mqtt',
    username,
    password,
    topicPrefix,
  };
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let mqttConfig;
  try {
    mqttConfig = normalizeMqttConfig(
      (await request.json()) as Record<string, unknown>,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Invalid MQTT settings.',
      },
      { status: 400 },
    );
  }

  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('key')
    .eq('user_id', user.id)
    .in('key_type', ['wordpress_server', 'strapi_server', 'internal_service'])
    .is('revoked_at', null)
    .limit(1)
    .maybeSingle();
  if (!apiKey?.key)
    return NextResponse.json(
      {
        error:
          'Create an active WordPress or Strapi API key before testing MQTT.',
      },
      { status: 409 },
    );

  const payload = JSON.stringify({
    type: 'mqtt_connection_test',
    mqttConnection: { mode: 'custom' },
    mqttConfig,
  });
  const timestamp = Date.now().toString();
  const nonce = `${timestamp}-${crypto.randomUUID()}`;
  const signature = await hmacHex(
    String(apiKey.key),
    `${timestamp}.${nonce}.${payload}`,
  );

  try {
    const response = await fetch(process.env.WPNOTIF_API_URL || defaultApiUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey.key}`,
        'content-type': 'application/json',
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature,
      },
      body: payload,
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    const result = (await response.json().catch(() => null)) as {
      connected?: boolean;
      error?: string;
      details?: string;
    } | null;
    if (!response.ok || result?.connected !== true)
      return NextResponse.json(
        {
          error:
            result?.details ||
            result?.error ||
            'Could not connect to HiveMQ Cloud.',
        },
        { status: response.status || 502 },
      );
    return NextResponse.json({ connected: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.name === 'TimeoutError'
            ? 'The HiveMQ connection test timed out.'
            : 'The HiveMQ connection test could not be completed.',
      },
      { status: 502 },
    );
  }
}
