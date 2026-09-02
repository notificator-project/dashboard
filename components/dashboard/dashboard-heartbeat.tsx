'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toast';

const heartbeatIntervalMs = 15_000;
const focusRefreshThresholdMs = 5_000;

type HeartbeatNotification = {
  id: string;
  title: string;
  body: string;
  source: string;
  severity: 'Critical' | 'Warning' | 'Information';
};

function toastType(severity: HeartbeatNotification['severity']) {
  if (severity === 'Critical') return 'error';
  if (severity === 'Warning') return 'warning';
  return 'info';
}

function toastDescription(notification: HeartbeatNotification) {
  const body = notification.body.trim();
  const summary = body.length > 120 ? `${body.slice(0, 117)}…` : body;
  return [notification.source, summary].filter(Boolean).join(' · ');
}

export function DashboardHeartbeat({
  notifications,
}: {
  notifications: HeartbeatNotification[];
}) {
  const router = useRouter();
  const lastCheck = useRef(0);
  const checking = useRef(false);
  const latestNotificationId = useRef(notifications[0]?.id || null);
  const knownNotificationIds = useRef<Set<string> | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    lastCheck.current = Date.now();

    async function checkForUpdates() {
      if (checking.current || document.visibilityState !== 'visible') return;
      checking.current = true;
      lastCheck.current = Date.now();
      try {
        const response = await fetch('/api/notifications/pulse', {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          latestId?: string | null;
        };
        const nextId = payload.latestId || null;
        if (nextId !== latestNotificationId.current) {
          latestNotificationId.current = nextId;
          startTransition(() => router.refresh());
        }
      } finally {
        checking.current = false;
      }
    }

    function checkIfVisible() {
      if (document.visibilityState === 'visible') void checkForUpdates();
    }

    function checkAfterReturn() {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastCheck.current >= focusRefreshThresholdMs
      ) {
        void checkForUpdates();
      }
    }

    const interval = window.setInterval(checkIfVisible, heartbeatIntervalMs);
    document.addEventListener('visibilitychange', checkAfterReturn);
    window.addEventListener('focus', checkAfterReturn);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', checkAfterReturn);
      window.removeEventListener('focus', checkAfterReturn);
    };
  }, [router]);

  useEffect(() => {
    const currentIds = notifications.map((notification) => notification.id);
    latestNotificationId.current = currentIds[0] || null;
    if (!knownNotificationIds.current) {
      knownNotificationIds.current = new Set(currentIds);
      return;
    }

    const newNotifications = notifications.filter(
      (notification) => !knownNotificationIds.current?.has(notification.id),
    );
    currentIds.forEach((id) => knownNotificationIds.current?.add(id));

    newNotifications
      .slice(0, 3)
      .reverse()
      .forEach((notification) => {
        toast.add({
          id: `notification-${notification.id}`,
          title: notification.title,
          description: toastDescription(notification),
          type: toastType(notification.severity),
          priority: notification.severity === 'Critical' ? 'high' : 'low',
          actionProps: {
            children: 'Open',
            onClick: () => router.push(`/notifications/${notification.id}`),
          },
        });
      });

    if (newNotifications.length > 3) {
      toast.add({
        id: `notification-summary-${currentIds[0]}`,
        title: `${newNotifications.length - 3} more new notifications`,
        description: 'Open the inbox to review the remaining alerts.',
        type: 'info',
        actionProps: {
          children: 'View inbox',
          onClick: () => router.push('/notifications'),
        },
      });
    }
  }, [notifications, router]);

  return (
    <span className="sr-only" aria-live="polite" aria-atomic="true">
      {pending ? 'Refreshing account data' : ''}
    </span>
  );
}
