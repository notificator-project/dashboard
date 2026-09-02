'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Download,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { FormMessage } from '@/components/auth/form-message';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DashboardDevice } from '@/lib/dashboard/overview';

type Release = {
  version: string;
  notes: string;
  channel: 'stable' | 'preview';
  releasedAt: string;
};

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function compareVersions(left: string, right: string) {
  const parse = (value: string) => {
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
    return match ? match.slice(1).map(Number) : null;
  };
  const a = parse(left);
  const b = parse(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

export function DeviceFirmwareCard({
  device,
  userId,
}: {
  device: DashboardDevice;
  userId: string;
}) {
  const router = useRouter();
  const [release, setRelease] = useState<Release | null>(null);
  const [pending, setPending] = useState<'check' | 'refresh' | 'ota' | ''>('');
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<'success' | 'error'>('success');
  const supported = ['notificator_base', 'notificator_touch_349'].includes(
    device.deviceType.toLowerCase(),
  );
  const comparison = release
    ? compareVersions(release.version, device.firmwareVersion)
    : null;
  const updateAvailable = comparison === 1;
  const updatePending = ['queued', 'updating'].includes(
    device.firmwareUpdateStatus.toLowerCase(),
  );

  function mqttConfig() {
    const metadataKey = `notificator_mqtt_metadata_v1_${userId}`;
    const passwordKey = `notificator_mqtt_session_v1_${userId}`;
    try {
      const metadata = JSON.parse(
        window.localStorage.getItem(metadataKey) || '{}',
      ) as Record<string, unknown>;
      return {
        host: text(metadata.host),
        username: text(metadata.username),
        password: window.sessionStorage.getItem(passwordKey) || '',
        topicPrefix: text(metadata.topicPrefix, 'notificator-project'),
      };
    } catch {
      return { host: '', username: '', password: '', topicPrefix: '' };
    }
  }

  async function run(action: 'check' | 'refresh' | 'ota') {
    if (action === 'ota') {
      const confirmed = window.confirm(
        `Update ${device.name} to firmware ${release?.version}? Keep the device powered on until it restarts.`,
      );
      if (!confirmed) return;
    }
    setPending(action);
    setMessage('');
    const response = await fetch(
      `/api/devices/${encodeURIComponent(device.id)}/firmware`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(action === 'check' ? {} : { mqttConfig: mqttConfig() }),
        }),
      },
    );
    const payload = (await response.json()) as {
      error?: string;
      release?: Release;
      result?: { firmwareVersion?: string };
    };
    if (!response.ok) {
      setTone('error');
      setMessage(payload.error || 'The firmware request failed.');
      setPending('');
      return;
    }
    if (payload.release) setRelease(payload.release);
    setTone('success');
    setMessage(
      action === 'ota'
        ? `Update to ${payload.release?.version || release?.version} queued. The device will report progress after it restarts.`
        : action === 'refresh'
          ? `Device status refreshed${payload.result?.firmwareVersion ? `: firmware ${payload.result.firmwareVersion}` : ''}.`
          : 'Latest firmware checked.',
    );
    setPending('');
    if (action !== 'check') router.refresh();
  }

  useEffect(() => {
    if (!supported) return;
    let active = true;
    void fetch(`/api/devices/${encodeURIComponent(device.id)}/firmware`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'check' }),
    })
      .then(async (response) => ({
        ok: response.ok,
        payload: (await response.json()) as {
          error?: string;
          release?: Release;
        },
      }))
      .then(({ ok, payload }) => {
        if (!active) return;
        if (ok && payload.release) {
          setRelease(payload.release);
          return;
        }
        setTone('error');
        setMessage(payload.error || 'The firmware catalog is unavailable.');
      })
      .catch(() => {
        if (!active) return;
        setTone('error');
        setMessage('The firmware catalog is unavailable.');
      });
    return () => {
      active = false;
    };
  }, [device.id, supported]);

  if (!supported) return null;

  return (
    <section className="device-firmware-card">
      <div className="device-firmware-heading">
        <span className="device-firmware-icon">
          <ShieldCheck />
        </span>
        <div>
          <h2>Firmware</h2>
          <p>Official signed releases for this device model.</p>
        </div>
        <Badge variant="outline">
          {release?.channel === 'preview'
            ? 'Preview channel'
            : 'Stable channel'}
        </Badge>
      </div>
      {message ? <FormMessage tone={tone}>{message}</FormMessage> : null}
      <div className="firmware-version-grid">
        <div>
          <span>Installed</span>
          <strong>
            {device.firmwareVersion
              ? `v${device.firmwareVersion}`
              : 'Not reported'}
          </strong>
          <small>Last device sync {device.lastSynced}</small>
        </div>
        <div>
          <span>Latest release</span>
          <strong>{release ? `v${release.version}` : 'Checking…'}</strong>
          <small>{release?.notes || 'Reading the signed catalog.'}</small>
        </div>
        <div>
          <span>Update state</span>
          <strong className={updatePending ? 'firmware-pending' : ''}>
            {updatePending
              ? `Updating to v${device.firmwareTargetVersion || release?.version || ''}`
              : updateAvailable
                ? 'Update available'
                : comparison === 0
                  ? 'Up to date'
                  : device.firmwareUpdateStatus === 'failed'
                    ? 'Update failed'
                    : 'Check device status'}
          </strong>
          <small>
            {device.firmwareLastError ||
              'Updates are verified on-device before installation.'}
          </small>
        </div>
      </div>
      <div className="device-firmware-actions">
        <Button
          type="button"
          variant="outline"
          onClick={() => run('refresh')}
          disabled={Boolean(pending) || device.isPaused}
        >
          {pending === 'refresh' ? (
            <LoaderCircle className="auth-spinner" />
          ) : (
            <RefreshCw />
          )}
          Refresh device version
        </Button>
        <Button
          type="button"
          onClick={() => run('ota')}
          disabled={
            Boolean(pending) ||
            device.isPaused ||
            !release ||
            !updateAvailable ||
            updatePending
          }
        >
          {pending === 'ota' ? (
            <LoaderCircle className="auth-spinner" />
          ) : comparison === 0 ? (
            <CheckCircle2 />
          ) : (
            <Download />
          )}
          {device.isPaused
            ? 'Resume to update'
            : updatePending
              ? 'Update in progress'
              : comparison === 0
                ? 'Already up to date'
                : release
                  ? `Update to v${release.version}`
                  : 'Checking release…'}
        </Button>
      </div>
    </section>
  );
}
