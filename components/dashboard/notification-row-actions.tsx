'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  LoaderCircle,
  Lock,
  LockOpen,
  Mail,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

export function NotificationRowActions({
  id,
  title,
  unread,
  locked,
}: {
  id: string;
  title: string;
  unread: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<'read' | 'lock' | 'delete' | ''>('');

  async function updateReadState() {
    setPending('read');
    const response = await fetch(
      `/api/notifications/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ read: unread }),
      },
    );
    const payload = (await response.json()) as {
      error?: string;
      notification?: { read?: boolean };
    };
    if (response.ok && payload.notification?.read === unread) router.refresh();
    else
      toast.add({
        title: 'Read status not updated',
        description:
          payload.error || 'The saved state did not match the requested state.',
        type: 'error',
      });
    setPending('');
  }

  async function updateLockedState() {
    setPending('lock');
    const response = await fetch(
      `/api/notifications/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locked: !locked }),
      },
    );
    const payload = (await response.json()) as { error?: string };
    if (response.ok) router.refresh();
    else
      toast.add({
        title: 'Lock status not updated',
        description: payload.error || 'Please try again.',
        type: 'error',
      });
    setPending('');
  }

  async function deleteNotification() {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setPending('delete');
    const response = await fetch(
      `/api/notifications/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    const payload = (await response.json()) as { error?: string };
    if (response.ok) router.refresh();
    else
      toast.add({
        title: 'Notification not deleted',
        description: payload.error || 'Please try again.',
        type: 'error',
      });
    setPending('');
  }

  return (
    <div className="notification-row-actions">
      <Button
        variant="ghost"
        size="icon"
        onClick={updateLockedState}
        disabled={Boolean(pending)}
        aria-label={locked ? `Unlock ${title}` : `Lock ${title}`}
        title={locked ? 'Unlock notification' : 'Lock notification'}
      >
        {pending === 'lock' ? (
          <LoaderCircle className="auth-spinner" />
        ) : locked ? (
          <LockOpen />
        ) : (
          <Lock />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={updateReadState}
        disabled={Boolean(pending)}
        aria-label={
          unread ? `Mark ${title} as read` : `Mark ${title} as unread`
        }
        title={unread ? 'Mark as read' : 'Mark as unread'}
      >
        {pending === 'read' ? (
          <LoaderCircle className="auth-spinner" />
        ) : unread ? (
          <Check />
        ) : (
          <Mail />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={deleteNotification}
        disabled={Boolean(pending) || locked}
        aria-label={`Delete ${title}`}
        title={locked ? 'Unlock before deleting' : 'Delete notification'}
        className="notification-delete-button"
      >
        {pending === 'delete' ? (
          <LoaderCircle className="auth-spinner" />
        ) : (
          <Trash2 />
        )}
      </Button>
    </div>
  );
}
