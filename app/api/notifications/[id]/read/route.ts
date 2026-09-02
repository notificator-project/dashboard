import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
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

  const { error } = await supabase
    .from('encrypted_notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('locked', false);
  if (error)
    return NextResponse.json(
      { error: 'Unable to update notification' },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
