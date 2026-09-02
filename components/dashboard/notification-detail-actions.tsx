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

export function NotificationDetailActions({
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
    if (response.ok) router.refresh();
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
    if (response.ok) router.refresh();
    setPending('');
  }

  async function deleteNotification() {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setPending('delete');
    const response = await fetch(
      `/api/notifications/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    if (response.ok) {
      router.push('/notifications');
      router.refresh();
      return;
    }
    setPending('');
  }

  return (
    <div className="notification-detail-actions">
      <Button
        variant="outline"
        onClick={updateLockedState}
        disabled={Boolean(pending)}
      >
        {pending === 'lock' ? (
          <LoaderCircle className="auth-spinner" />
        ) : locked ? (
          <LockOpen />
        ) : (
          <Lock />
        )}
        {locked ? 'Unlock' : 'Lock'}
      </Button>
      <Button
        variant="outline"
        onClick={updateReadState}
        disabled={Boolean(pending)}
      >
        {pending === 'read' ? (
          <LoaderCircle className="auth-spinner" />
        ) : unread ? (
          <Check />
        ) : (
          <Mail />
        )}
        {unread ? 'Mark as read' : 'Mark as unread'}
      </Button>
      <Button
        variant="ghost"
        onClick={deleteNotification}
        disabled={Boolean(pending) || locked}
        title={
          locked ? 'Unlock this notification before deleting it' : undefined
        }
        className="notification-delete-button"
      >
        {pending === 'delete' ? (
          <LoaderCircle className="auth-spinner" />
        ) : (
          <Trash2 />
        )}
        Delete
      </Button>
    </div>
  );
}
