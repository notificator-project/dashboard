import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const defaultApiUrl =
  'https://wpnotif.notificator-project.com/.netlify/functions/wpnotif-api';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMqttConfig(body: Record<string, unknown>) {
  const input =
    body.mqttConfig && typeof body.mqttConfig === 'object'
      ? (body.mqttConfig as Record<string, unknown>)
      : {};
  const host = text(input.host)
    .toLowerCase()
    .replace(/^wss:\/\//, '')
    .replace(/:\d+.*$/, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
  const username = text(input.username);
  const password = typeof input.password === 'string' ? input.password : '';
  const topicPrefix = (
    text(input.topicPrefix) || 'notificator-project'
  ).replace(/^\/+|\/+$/g, '');
  if (!host.endsWith('.hivemq.cloud') || !/^[a-z0-9.-]+$/.test(host))
    throw new Error('Invalid HiveMQ settings.');
  if (!username || !password) throw new Error('Incomplete HiveMQ settings.');
  if (
    !topicPrefix ||
    !/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(topicPrefix)
  )
    throw new Error('Invalid MQTT topic prefix.');
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

async function syncDevice(
  secret: string,
  deviceId: string,
  mqttConfig: Record<string, unknown>,
) {
  const body = JSON.stringify({
    type: 'device_status_sync',
    deviceId,
    mqttConnection: { mode: 'custom' },
    mqttConfig,
  });
  const timestamp = Date.now().toString();
  const nonce = `${timestamp}-${crypto.randomUUID()}`;
  const signature = await hmacHex(secret, `${timestamp}.${nonce}.${body}`);
  const response = await fetch(process.env.WPNOTIF_API_URL || defaultApiUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
      'x-timestamp': timestamp,
      'x-nonce': nonce,
      'x-signature': signature,
    },
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Status sync failed.');
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  try {
    const mqttConfig = normalizeMqttConfig(body);
    const [{ data: apiKey }, { data: devices }] = await Promise.all([
      supabase
        .from('api_keys')
        .select('key')
        .eq('user_id', user.id)
        .in('key_type', [
          'wordpress_server',
          'strapi_server',
          'internal_service',
        ])
        .is('revoked_at', null)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('devices')
        .select('device_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('is_paused', false),
    ]);
    if (!apiKey?.key)
      return NextResponse.json(
        { error: 'An active integration API key is required.' },
        { status: 409 },
      );
    const deviceIds = (Array.isArray(devices) ? devices : [])
      .map((device) => text(device.device_id))
      .filter(Boolean);
    if (deviceIds.length === 0)
      return NextResponse.json({ ok: true, synced: 0, failed: 0 });

    const results = await Promise.allSettled(
      deviceIds.map((deviceId) =>
        syncDevice(String(apiKey.key), deviceId, mqttConfig),
      ),
    );
    const synced = results.filter(
      (result) => result.status === 'fulfilled',
    ).length;
    return NextResponse.json({
      ok: synced > 0,
      synced,
      failed: results.length - synced,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Device sync failed.',
      },
      { status: 400 },
    );
  }
}
