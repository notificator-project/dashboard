'use client';

import { useState, type SyntheticEvent } from 'react';
import { LoaderCircle, Save } from 'lucide-react';
import { FormMessage } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DashboardDevice } from '@/lib/dashboard/overview';
import { readFormText } from '@/lib/form-data';

const timezoneOptions = [
  ['Europe/Athens', 'EET-2EEST,M3.5.0/3,M10.5.0/4'],
  ['Europe/London', 'GMT0BST,M3.5.0/1,M10.5.0/2'],
  ['Europe/Berlin', 'CET-1CEST,M3.5.0/2,M10.5.0/3'],
  ['Europe/Istanbul', 'TRT-3'],
  ['Europe/Moscow', 'MSK-3'],
  ['America/New York', 'EST5EDT,M3.2.0/2,M11.1.0/2'],
  ['America/Chicago', 'CST6CDT,M3.2.0/2,M11.1.0/2'],
  ['America/Denver', 'MST7MDT,M3.2.0/2,M11.1.0/2'],
  ['America/Los Angeles', 'PST8PDT,M3.2.0/2,M11.1.0/2'],
  ['Asia/Tokyo', 'JST-9'],
  ['Asia/Shanghai', 'CST-8'],
  ['Asia/Kolkata', 'IST-5:30'],
  ['Asia/Dubai', 'GST-4'],
  ['Australia/Sydney', 'AEST-10AEDT,M10.1.0/2,M4.1.0/3'],
  ['UTC', 'UTC0'],
] as const;

function supportsWeather(deviceType: string) {
  return ['notificator_base', 'notificator_touch_349'].includes(
    deviceType.toLowerCase(),
  );
}

export function DeviceSettingsForm({
  device,
  userId,
}: {
  device: DashboardDevice;
  userId: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const weatherEnabled = supportsWeather(device.deviceType);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const weatherCity = weatherEnabled ? readFormText(form, 'weatherCity') : '';
    const weatherTimezone = weatherEnabled
      ? readFormText(form, 'weatherTimezone')
      : '';
    const idleTheme = weatherEnabled
      ? Number(readFormText(form, 'idleTheme'))
      : 0;
    const response = await fetch(
      `/api/devices/${encodeURIComponent(device.id)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nickname: readFormText(form, 'nickname'),
          weatherCity,
          weatherTimezone,
          idleTheme,
        }),
      },
    );
    if (!response.ok) {
      setMessage('Device settings could not be saved.');
      setPending(false);
      return;
    }

    if (!weatherEnabled) {
      setMessage('Device settings saved.');
      setPending(false);
      return;
    }

    const metadataKey = `notificator_mqtt_metadata_v1_${userId}`;
    const passwordKey = `notificator_mqtt_session_v1_${userId}`;
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(
        window.localStorage.getItem(metadataKey) || '{}',
      ) as Record<string, unknown>;
    } catch {
      metadata = {};
    }
    const commandResponse = await fetch(
      `/api/devices/${encodeURIComponent(device.id)}/commands`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { cmd: 'idle_theme', value: idleTheme },
            {
              cmd: 'weather_config',
              city: weatherCity,
              timezone: weatherTimezone,
            },
          ],
          mqttConfig: {
            host: typeof metadata.host === 'string' ? metadata.host : '',
            username:
              typeof metadata.username === 'string' ? metadata.username : '',
            password: window.sessionStorage.getItem(passwordKey) || '',
            topicPrefix:
              typeof metadata.topicPrefix === 'string'
                ? metadata.topicPrefix
                : 'notificator-project',
          },
        }),
      },
    );
    const commandPayload = (await commandResponse.json()) as { error?: string };
    setMessage(
      commandResponse.ok
        ? 'Device settings saved and delivered.'
        : `Device settings saved, but live delivery failed: ${commandPayload.error || 'check MQTT settings and try again.'}`,
    );
    setPending(false);
  }

  return (
    <form className="device-settings-card" onSubmit={submit}>
      <div className="device-settings-heading">
        <div>
          <h2>Device identity</h2>
          <p>Give this device a recognizable name in your account.</p>
        </div>
        <span>{device.type}</span>
      </div>
      {message ? (
        <FormMessage
          tone={
            message === 'Device settings saved.' ||
            message === 'Device settings saved and delivered.'
              ? 'success'
              : 'error'
          }
        >
          {message}
        </FormMessage>
      ) : null}
      <div className="device-settings-grid">
        <label htmlFor="device-nickname">
          Display name
          <Input
            id="device-nickname"
            name="nickname"
            defaultValue={device.nickname}
            placeholder={device.deviceId || 'My Notificator'}
            maxLength={80}
          />
        </label>
        <label htmlFor="device-id">
          Device ID
          <Input id="device-id" value={device.deviceId} readOnly />
        </label>
      </div>
      {weatherEnabled ? (
        <section className="device-weather-settings">
          <div>
            <h2>Clock and weather</h2>
            <p>Saved defaults for devices that support an idle display.</p>
          </div>
          <div className="device-settings-grid">
            <label htmlFor="weather-city">
              Weather location
              <Input
                id="weather-city"
                name="weatherCity"
                defaultValue={device.weatherCity}
                placeholder="Thessaloniki"
                maxLength={120}
              />
            </label>
            <label htmlFor="weather-timezone">
              Timezone
              <select
                id="weather-timezone"
                name="weatherTimezone"
                defaultValue={device.weatherTimezone || 'UTC0'}
              >
                {device.weatherTimezone &&
                !timezoneOptions.some(
                  ([, value]) => value === device.weatherTimezone,
                ) ? (
                  <option value={device.weatherTimezone}>
                    {device.weatherTimezone}
                  </option>
                ) : null}
                {timezoneOptions.map(([label, value]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="idle-theme">
              Idle display
              <select
                id="idle-theme"
                name="idleTheme"
                defaultValue={String(device.idleTheme)}
              >
                <option value="0">Clock</option>
                <option value="1">Weather and clock</option>
                <option value="2">Weather</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="auth-spinner" /> : <Save />}
        {pending ? 'Saving…' : 'Save device settings'}
      </Button>
    </form>
  );
}
