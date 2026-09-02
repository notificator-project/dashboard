import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const deviceTypes = new Set([
  'notificator_base',
  'notificator_touch_349',
  'notificator_matter',
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const deviceId =
    typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
  const nickname =
    typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 80) : '';
  const deviceType =
    typeof body.deviceType === 'string'
      ? body.deviceType.trim().toLowerCase()
      : '';
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(deviceId))
    return NextResponse.json(
      { error: 'Enter a valid device ID.' },
      { status: 400 },
    );
  if (!deviceTypes.has(deviceType))
    return NextResponse.json(
      { error: 'Select a supported device type.' },
      { status: 400 },
    );

  const plainId = deviceId.replace(/^WPNOTIF-/i, '').toLowerCase();
  const candidates = [
    deviceId,
    plainId,
    plainId.toUpperCase(),
    `WPNOTIF-${plainId}`,
    `WPNOTIF-${plainId.toUpperCase()}`,
  ];
  const { data: existing } = await supabase
    .from('devices')
    .select('id')
    .eq('user_id', user.id)
    .in('device_id', [...new Set(candidates)])
    .limit(1)
    .maybeSingle();
  if (existing)
    return NextResponse.json(
      { error: 'This device is already connected to your account.' },
      { status: 409 },
    );

  const { data, error } = await supabase
    .from('devices')
    .insert({
      user_id: user.id,
      device_id: deviceId,
      name: nickname || deviceId,
      nickname: nickname || null,
      device_type: deviceType,
      is_active: true,
      is_paused: false,
      last_status: 'unknown',
      idle_theme: 0,
    })
    .select('id')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'The device could not be added.' },
      { status: 500 },
    );
  return NextResponse.json({ id: data.id }, { status: 201 });
}
