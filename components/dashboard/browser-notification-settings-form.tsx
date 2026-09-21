'use client';

import { useState, useSyncExternalStore } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import {
  defaultBrowserNotificationPreferences,
  readBrowserNotificationPreferences,
  saveBrowserNotificationPreferences,
  subscribeToBrowserNotificationPreferences,
  type BrowserNotificationPreferences,
} from '@/lib/browser-notification-preferences';

export function BrowserNotificationSettingsForm() {
  const savedPreferences = useSyncExternalStore(
    subscribeToBrowserNotificationPreferences,
    readBrowserNotificationPreferences,
    () => defaultBrowserNotificationPreferences,
  );
  const preferenceKey = JSON.stringify(savedPreferences);

  return (
    <BrowserNotificationSettingsEditor
      key={preferenceKey}
      initialPreferences={savedPreferences}
    />
  );
}

function BrowserNotificationSettingsEditor({
  initialPreferences,
}: {
  initialPreferences: BrowserNotificationPreferences;
}) {
  const [preferences, setPreferences] =
    useState<BrowserNotificationPreferences>(initialPreferences);
  const [pending, setPending] = useState(false);

  async function enableNotifications() {
    if (!('Notification' in window)) {
      toast.add({
        title: 'Browser notifications unavailable',
        description: 'This browser does not support native notifications.',
        type: 'error',
      });
      return;
    }

    setPending(true);
    try {
      const permission =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
      const enabled = permission === 'granted';
      const next = { enabled };
      setPreferences(next);
      saveBrowserNotificationPreferences(next);

      if (enabled) {
        toast.add({
          title: 'Browser notifications enabled',
          description:
            'Alerts will appear when the dashboard is in another tab or window.',
          type: 'success',
        });
      } else {
        toast.add({
          title: 'Browser notifications were not enabled',
          description:
            'Allow notifications in your browser settings to turn them on.',
          type: 'warning',
        });
      }
    } finally {
      setPending(false);
    }
  }

  function disableNotifications() {
    const next = { enabled: false };
    setPreferences(next);
    saveBrowserNotificationPreferences(next);
    toast.add({
      title: 'Browser notifications disabled',
      description:
        'Dashboard toasts will continue to appear while this site is open.',
      type: 'info',
    });
  }

  function sendTestNotification() {
    if (!enabled || !('Notification' in window)) return;
    try {
      const testNotification = new Notification(
        'Browser notifications are working',
        {
          body: 'New Notificator alerts will appear here when this dashboard is in another tab or window.',
          tag: 'notificator-browser-notification-test',
        },
      );
      testNotification.onclick = () => {
        window.focus();
        testNotification.close();
      };
      toast.add({
        title: 'Test notification sent',
        description:
          'If it is not visible, check your browser and operating-system notification settings.',
        type: 'success',
      });
    } catch {
      toast.add({
        title: 'The test notification could not be sent',
        description:
          'Check that this site is allowed to send notifications in your browser settings.',
        type: 'error',
      });
    }
  }

  const supported = typeof window === 'undefined' || 'Notification' in window;
  const permission =
    supported && typeof window !== 'undefined'
      ? Notification.permission
      : 'default';
  const enabled = preferences.enabled && permission === 'granted';

  return (
    <div className="browser-notification-settings">
      <div className="toast-settings-intro">
        {enabled ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}
        <p>
          Get a native alert when a new notification arrives while this
          dashboard is in another tab or window. Existing notifications are not
          replayed. Dashboard toasts remain available when this page is active.
        </p>
      </div>
      <div className="browser-notification-status">
        <span className={enabled ? 'active' : ''}>
          {enabled ? (
            <Check aria-hidden="true" />
          ) : (
            <BellOff aria-hidden="true" />
          )}
          {enabled
            ? 'Browser notifications enabled'
            : 'Browser notifications are off'}
        </span>
        {!supported ? (
          <small>Your browser does not support native notifications.</small>
        ) : permission === 'denied' ? (
          <small>
            Notifications are blocked for this site. Allow them in your browser
            settings, then enable them again.
          </small>
        ) : null}
      </div>
      <Button
        type="button"
        variant={enabled ? 'outline' : 'default'}
        disabled={pending || !supported}
        onClick={enabled ? disableNotifications : enableNotifications}
      >
        {enabled ? <BellOff aria-hidden="true" /> : <Bell aria-hidden="true" />}
        {enabled
          ? 'Disable browser notifications'
          : 'Enable browser notifications'}
      </Button>
      {enabled ? (
        <Button type="button" variant="outline" onClick={sendTestNotification}>
          <Bell aria-hidden="true" />
          Send test notification
        </Button>
      ) : null}
    </div>
  );
}
