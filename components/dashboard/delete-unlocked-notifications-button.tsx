'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DeleteUnlockedNotificationsButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function deleteUnlockedNotifications() {
    if (
      !window.confirm(
        'Delete every unlocked notification? Locked notifications will be kept. This cannot be undone.',
      )
    )
      return;

    setPending(true);
    const response = await fetch('/api/notifications/delete-all', {
      method: 'DELETE',
    });
    if (response.ok) router.refresh();
    setPending(false);
  }

  return (
    <Button
      variant="ghost"
      onClick={deleteUnlockedNotifications}
      disabled={pending || disabled}
      title={disabled ? 'All notifications are locked' : undefined}
      className="notification-delete-button"
    >
      {pending ? <LoaderCircle className="auth-spinner" /> : <Trash2 />}
      {pending ? 'Deleting…' : 'Delete all unlocked'}
    </Button>
  );
}
