import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const weatherDeviceTypes = new Set([
  'notificator_base',
  'notificator_touch_349',
]);

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

  const { data: device, error: loadError } = await supabase
    .from('devices')
    .select('id, device_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (loadError)
    return NextResponse.json(
      { error: 'Unable to load device.' },
      { status: 500 },
    );
  if (!device)
    return NextResponse.json({ error: 'Device not found.' }, { status: 404 });

  const body = (await request.json()) as Record<string, unknown>;
  const nickname =
    typeof body.nickname === 'string'
      ? body.nickname.trim().slice(0, 80) || null
      : null;
  const supportsWeather = weatherDeviceTypes.has(
    String(device.device_type || '').toLowerCase(),
  );
  const weatherCity =
    supportsWeather && typeof body.weatherCity === 'string'
      ? body.weatherCity.trim().slice(0, 120) || null
      : null;
  const weatherTimezone =
    supportsWeather && typeof body.weatherTimezone === 'string'
      ? body.weatherTimezone.trim().slice(0, 120) || null
      : null;
  const requestedTheme = Number(body.idleTheme);
  const idleTheme =
    supportsWeather && [0, 1, 2].includes(requestedTheme) ? requestedTheme : 0;

  const { error } = await supabase
    .from('devices')
    .update({
      nickname,
      weather_city: weatherCity,
      weather_timezone: weatherTimezone,
      idle_theme: idleTheme,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error)
    return NextResponse.json(
      { error: 'Unable to save device settings.' },
      { status: 500 },
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
    .from('devices')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_paused', true)
    .select('id')
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: 'The device could not be removed.' },
      { status: 500 },
    );
  if (!data)
    return NextResponse.json(
      { error: 'Pause the device before removing it.' },
      { status: 409 },
    );
  return NextResponse.json({ ok: true });
}
