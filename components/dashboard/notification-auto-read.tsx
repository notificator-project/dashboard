'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function NotificationAutoRead({
  id,
  unread,
  locked,
}: {
  id: string;
  unread: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const initialState = useRef({ id, unread, locked });

  useEffect(() => {
    const notification = initialState.current;
    if (!notification.unread || notification.locked) return;

    const controller = new AbortController();
    void fetch(
      `/api/notifications/${encodeURIComponent(notification.id)}/read`,
      {
        method: 'POST',
        signal: controller.signal,
      },
    )
      .then((response) => {
        if (response.ok) router.refresh();
      })
      .catch(() => {
        // An aborted request is expected when the user leaves the page.
      });

    return () => controller.abort();
  }, [router]);

  return null;
}
