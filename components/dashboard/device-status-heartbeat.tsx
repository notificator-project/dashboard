'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { restoreAccountMqtt } from '@/lib/mqtt/browser';

const deviceSyncIntervalMs = 60_000;

export function DeviceStatusHeartbeat({ userId }: { userId: string }) {
  const router = useRouter();
  const running = useRef(false);
  const lastSync = useRef(0);

  useEffect(() => {
    let active = true;
    // Account restoration is bounded and does not block page rendering.
    void restoreAccountMqtt(userId, () => active).catch(() => {});
    async function sync() {
      if (running.current || document.visibilityState !== 'visible') return;
      const lastSyncKey = `notificator_device_sync_v1_${userId}`;
      const previousSync = Number(
        window.sessionStorage.getItem(lastSyncKey) || '0',
      );
      if (Date.now() - previousSync < deviceSyncIntervalMs) return;
      const metadataKey = `notificator_mqtt_metadata_v1_${userId}`;
      const passwordKey = `notificator_mqtt_session_v1_${userId}`;
      let metadata: Record<string, unknown> = {};
      try {
        metadata = JSON.parse(
          window.localStorage.getItem(metadataKey) || '{}',
        ) as Record<string, unknown>;
      } catch {
        return;
      }
      const password = window.sessionStorage.getItem(passwordKey) || '';
      if (!metadata.host || !metadata.username || !password) return;

      running.current = true;
      lastSync.current = Date.now();
      window.sessionStorage.setItem(lastSyncKey, String(lastSync.current));
      try {
        const response = await fetch('/api/devices/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            mqttConfig: {
              host: metadata.host,
              username: metadata.username,
              password,
              topicPrefix: metadata.topicPrefix || 'notificator-project',
            },
          }),
        });
        if (response.ok) router.refresh();
      } catch {
        // A transient network failure must not produce an unhandled rejection.
      } finally {
        running.current = false;
      }
    }

    const initial = window.setTimeout(sync, 1200);
    const interval = window.setInterval(sync, deviceSyncIntervalMs);
    const afterMqttSave = () => {
      window.sessionStorage.removeItem(`notificator_device_sync_v1_${userId}`);
      void sync();
    };
    const afterReturn = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastSync.current >= deviceSyncIntervalMs
      )
        void sync();
    };
    window.addEventListener('notificator:mqtt-saved', afterMqttSave);
    document.addEventListener('visibilitychange', afterReturn);
    return () => {
      active = false;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener('notificator:mqtt-saved', afterMqttSave);
      document.removeEventListener('visibilitychange', afterReturn);
    };
  }, [router, userId]);

  return null;
}
