'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function markAllRead() {
    setPending(true);
    const response = await fetch('/api/notifications/read-all', {
      method: 'POST',
    });
    if (response.ok) router.refresh();
    setPending(false);
  }

  return (
    <Button variant="ghost" onClick={markAllRead} disabled={pending}>
      {pending ? <LoaderCircle className="auth-spinner" /> : <CheckCheck />}
      {pending ? 'Updating…' : 'Mark all read'}
    </Button>
  );
}
