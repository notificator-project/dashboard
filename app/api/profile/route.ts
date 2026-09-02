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
  const firstName =
    typeof body.firstName === 'string'
      ? body.firstName.trim().slice(0, 80)
      : '';
  const lastName =
    typeof body.lastName === 'string' ? body.lastName.trim().slice(0, 80) : '';
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error)
    return NextResponse.json(
      { error: 'Unable to save profile' },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
