'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DevicePauseButton({
  id,
  name,
  paused,
}: {
  id: string;
  name: string;
  paused: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function toggle() {
    if (
      !paused &&
      !window.confirm(
        `Pause ${name}? Notifications and live commands will stop until it is resumed.`,
      )
    )
      return;
    setPending(true);
    const response = await fetch(
      `/api/devices/${encodeURIComponent(id)}/pause`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paused: !paused }),
      },
    );
    setPending(false);
    if (response.ok) router.refresh();
  }

  async function remove() {
    if (
      !window.confirm(
        `Remove ${name} from your account? You will need its device ID to add it again.`,
      )
    )
      return;
    setRemoving(true);
    const response = await fetch(`/api/devices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      router.push('/devices');
      router.refresh();
      return;
    }
    setRemoving(false);
  }

  return (
    <span className="device-lifecycle-actions">
      <Button
        type="button"
        variant="outline"
        onClick={toggle}
        disabled={pending || removing}
      >
        {pending ? (
          <LoaderCircle className="auth-spinner" />
        ) : paused ? (
          <PlayCircle />
        ) : (
          <PauseCircle />
        )}
        {pending ? 'Saving…' : paused ? 'Resume device' : 'Pause device'}
      </Button>
      {paused ? (
        <Button
          type="button"
          variant="outline"
          onClick={remove}
          disabled={removing || pending}
          className="remove-device-button"
        >
          {removing ? <LoaderCircle className="auth-spinner" /> : <Trash2 />}
          {removing ? 'Removing…' : 'Remove device'}
        </Button>
      ) : null}
    </span>
  );
}
