import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('encrypted_notifications')
    .delete()
    .eq('user_id', user.id)
    .or('locked.eq.false,locked.is.null')
    .select('id');
  if (error)
    return NextResponse.json(
      { error: 'Unable to delete notifications.' },
      { status: 500 },
    );

  return NextResponse.json({ ok: true, deleted: data?.length || 0 });
}
