import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await authenticatedClient();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const updates: { read?: boolean; locked?: boolean } = {};
  if (typeof body.read === 'boolean') updates.read = body.read;
  if (typeof body.locked === 'boolean') updates.locked = body.locked;
  if (Object.keys(updates).length === 0)
    return NextResponse.json(
      { error: 'A valid read or locked state is required.' },
      { status: 400 },
    );
  const { data, error } = await supabase
    .from('encrypted_notifications')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, read, locked')
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: 'Unable to update notification.' },
      { status: 500 },
    );
  if (!data)
    return NextResponse.json(
      { error: 'Notification not found.' },
      { status: 404 },
    );
  return NextResponse.json({
    ok: true,
    notification: {
      id: String(data.id),
      read: Boolean(data.read),
      locked: Boolean(data.locked),
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await authenticatedClient();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: notification, error: lookupError } = await supabase
    .from('encrypted_notifications')
    .select('id, locked')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (lookupError)
    return NextResponse.json(
      { error: 'Unable to inspect notification.' },
      { status: 500 },
    );
  if (!notification)
    return NextResponse.json(
      { error: 'Notification not found.' },
      { status: 404 },
    );
  if (notification.locked)
    return NextResponse.json(
      { error: 'Unlock this notification before deleting it.' },
      { status: 409 },
    );
  const { error } = await supabase
    .from('encrypted_notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error)
    return NextResponse.json(
      { error: 'Unable to delete notification.' },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
