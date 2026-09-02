import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const defaultApiUrl =
  'https://wpnotif.notificator-project.com/.netlify/functions/wpnotif-api';
const defaultManifestUrl =
  'https://wpnotif.notificator-project.com/firmware/manifest.json';
const supportedChannels: Record<string, 'stable' | 'preview'> = {
  notificator_base: 'stable',
  notificator_touch_349: 'preview',
};

type FirmwareRelease = {
  version: string;
  notes: string;
  channel: 'stable' | 'preview';
  releasedAt: string;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMqttConfig(body: Record<string, unknown>) {
  const input =
    body.mqttConfig && typeof body.mqttConfig === 'object'
      ? (body.mqttConfig as Record<string, unknown>)
      : {};
  const host = (typeof input.host === 'string' ? input.host : '')
    .trim()
    .toLowerCase()
    .replace(/^wss:\/\//, '')
    .replace(/:\d+.*$/, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
  const username =
    typeof input.username === 'string' ? input.username.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const topicPrefix = (
    typeof input.topicPrefix === 'string'
      ? input.topicPrefix
      : 'notificator-project'
  )
    .trim()
    .replace(/^\/+|\/+$/g, '');

  if (!host.endsWith('.hivemq.cloud') || !/^[a-z0-9.-]+$/.test(host))
    throw new Error('Save valid HiveMQ Cloud settings before continuing.');
  const hasControlCharacters = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code < 32 || code === 127) return true;
    }
    return false;
  };
  if (!username || username.length > 128 || hasControlCharacters(username))
    throw new Error('The saved HiveMQ username is invalid.');
  if (!password || password.length > 512 || hasControlCharacters(password))
    throw new Error(
      'Enter the HiveMQ password again under Settings in this tab.',
    );
  if (
    !topicPrefix ||
    topicPrefix.length > 128 ||
    !/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(topicPrefix)
  )
    throw new Error('The saved MQTT topic prefix is invalid.');

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

async function callDeviceApi(secret: string, payload: object) {
  const body = JSON.stringify(payload);
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
  const result = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!response.ok) {
    throw new Error(
      text(result?.details) || text(result?.error) || 'Device request failed.',
    );
  }
  return result || {};
}

async function loadRelease(deviceType: string): Promise<FirmwareRelease> {
  const channel = supportedChannels[deviceType];
  if (!channel)
    throw new Error('Firmware updates are not available for this device type.');
  const response = await fetch(
    process.env.FIRMWARE_MANIFEST_URL || defaultManifestUrl,
    {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok) throw new Error('The firmware catalog is unavailable.');
  const manifest = (await response.json()) as {
    schemaVersion?: number;
    channels?: Record<
      string,
      { deviceTypes?: Record<string, Record<string, unknown>> }
    >;
  };
  const release = manifest.channels?.[channel]?.deviceTypes?.[deviceType];
  const version = text(release?.version);
  if (
    manifest.schemaVersion !== 2 ||
    !version ||
    !/^\d+\.\d+\.\d+$/.test(version)
  )
    throw new Error('No valid firmware release was found for this device.');
  return {
    version,
    notes: text(release?.notes),
    channel,
    releasedAt: text(release?.releasedAt),
  };
}

export async function POST(
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

  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('id, device_id, device_type, firmware_version')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (deviceError)
    return NextResponse.json(
      { error: 'Unable to load device.' },
      { status: 500 },
    );
  if (!device)
    return NextResponse.json({ error: 'Device not found.' }, { status: 404 });

  const deviceType = String(device.device_type || '')
    .trim()
    .toLowerCase();
  if (!supportedChannels[deviceType])
    return NextResponse.json(
      { error: 'Firmware updates are not available for this device type.' },
      { status: 409 },
    );

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const action = (text(body.action) || 'check').toLowerCase();

  try {
    const release = await loadRelease(deviceType);
    if (action === 'check') {
      return NextResponse.json({
        release,
        currentVersion: device.firmware_version || null,
      });
    }
    if (!['refresh', 'ota'].includes(action))
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });

    const mqttConfig = normalizeMqttConfig(body);
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
            'Create an active WordPress or Strapi API key before controlling a device.',
        },
        { status: 409 },
      );

    const result =
      action === 'refresh'
        ? await callDeviceApi(String(apiKey.key), {
            type: 'device_status_sync',
            deviceId: device.device_id,
            mqttConnection: { mode: 'custom' },
            mqttConfig,
          })
        : await callDeviceApi(String(apiKey.key), {
            type: 'device_cmd',
            deviceId: device.device_id,
            cmd: 'ota',
            channel: release.channel,
            version: release.version,
            force: false,
            mqttQos: 1,
            mqttConnection: { mode: 'custom' },
            mqttConfig,
          });

    return NextResponse.json({ ok: true, release, result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'The firmware request could not be completed.',
      },
      { status: 502 },
    );
  }
}
