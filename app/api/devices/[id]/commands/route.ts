import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const defaultApiUrl =
  'https://wpnotif.notificator-project.com/.netlify/functions/wpnotif-api';
const allowedCommands = new Set(['idle_theme', 'weather_config']);

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
  const hasControlCharacters = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code < 32 || code === 127) return true;
    }
    return false;
  };

  if (!host.endsWith('.hivemq.cloud') || !/^[a-z0-9.-]+$/.test(host))
    throw new Error('Save valid HiveMQ Cloud settings before continuing.');
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

async function publishCommand(secret: string, payload: object) {
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
  if (!response.ok)
    throw new Error(
      text(result?.details) ||
        text(result?.error) ||
        'Command delivery failed.',
    );
  return result;
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
    .select('id, device_id, device_type, is_active, is_paused')
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
  if (device.is_active === false || device.is_paused === true)
    return NextResponse.json(
      { error: 'The device is inactive or paused.' },
      { status: 409 },
    );

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const commands = Array.isArray(body.commands)
    ? body.commands.filter(
        (command): command is Record<string, unknown> =>
          Boolean(command) &&
          typeof command === 'object' &&
          allowedCommands.has(text((command as Record<string, unknown>).cmd)),
      )
    : [];
  if (commands.length === 0)
    return NextResponse.json(
      { error: 'No supported device commands were supplied.' },
      { status: 400 },
    );

  try {
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

    const delivered = [];
    for (const command of commands) {
      const cmd = text(command.cmd);
      const result = await publishCommand(String(apiKey.key), {
        type: 'device_cmd',
        deviceId: device.device_id,
        cmd,
        ...(cmd === 'idle_theme'
          ? { value: Number(command.value) }
          : {
              city: text(command.city),
              timezone: text(command.timezone),
            }),
        mqttQos: 1,
        mqttConnection: { mode: 'custom' },
        mqttConfig,
      });
      delivered.push({ cmd, result });
    }
    return NextResponse.json({ ok: true, delivered });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Device settings could not be delivered.',
      },
      { status: 502 },
    );
  }
}
