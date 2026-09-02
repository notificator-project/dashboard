import { NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/auth/session';

export async function GET() {
  const { user, supabase } = await getVerifiedUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('encrypted_notifications')
    .select('id')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error)
    return NextResponse.json(
      { error: 'Unable to check notifications.' },
      { status: 500 },
    );

  return NextResponse.json(
    { latestId: data?.id ? String(data.id) : null },
    { headers: { 'cache-control': 'private, no-store' } },
  );
}
