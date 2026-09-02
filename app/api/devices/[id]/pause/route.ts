import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (typeof body.paused !== 'boolean')
    return NextResponse.json(
      { error: 'A paused state is required.' },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from('devices')
    .update({
      is_paused: body.paused,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .select('id, is_paused')
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: 'The device state could not be changed.' },
      { status: 500 },
    );
  if (!data)
    return NextResponse.json({ error: 'Device not found.' }, { status: 404 });
  return NextResponse.json({ ok: true, paused: data.is_paused });
}
