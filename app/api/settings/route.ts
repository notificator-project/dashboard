import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  if (typeof body.emailNotifications !== 'boolean')
    return NextResponse.json({ error: 'Invalid preference' }, { status: 400 });
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      email_notifications: body.emailNotifications,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error)
    return NextResponse.json(
      { error: 'Unable to save preferences' },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
