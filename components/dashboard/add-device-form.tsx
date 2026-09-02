'use client';

import { useState, type SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, MonitorSmartphone, Plus } from 'lucide-react';
import { FormMessage } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readFormText } from '@/lib/form-data';

export function AddDeviceForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        deviceId: readFormText(form, 'deviceId'),
        nickname: readFormText(form, 'nickname'),
        deviceType: readFormText(form, 'deviceType'),
      }),
    });
    const payload = (await response.json()) as { id?: string; error?: string };
    if (!response.ok || !payload.id) {
      setError(payload.error || 'The device could not be added.');
      setPending(false);
      return;
    }
    router.push(`/devices/${encodeURIComponent(payload.id)}`);
    router.refresh();
  }

  return (
    <form className="device-settings-card add-device-card" onSubmit={submit}>
      <div className="device-settings-heading">
        <div>
          <h2>Connect a device</h2>
          <p>Use the ID shown on the device setup or information screen.</p>
        </div>
        <span className="add-device-mark">
          <MonitorSmartphone />
        </span>
      </div>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <div className="device-settings-grid">
        <label htmlFor="new-device-id">
          Device ID
          <Input
            id="new-device-id"
            name="deviceId"
            placeholder="30a04e0c"
            autoCapitalize="none"
            autoCorrect="off"
            maxLength={64}
            required
          />
        </label>
        <label htmlFor="new-device-name">
          Display name
          <Input
            id="new-device-name"
            name="nickname"
            placeholder="Office display"
            maxLength={80}
          />
        </label>
        <label htmlFor="new-device-type">
          Device type
          <select
            id="new-device-type"
            name="deviceType"
            defaultValue="notificator_base"
          >
            <option value="notificator_base">Notificator Base</option>
            <option value="notificator_touch_349">Notificator Touch</option>
            <option value="notificator_matter">Notificator Matter</option>
          </select>
        </label>
      </div>
      <div className="add-device-actions">
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="auth-spinner" /> : <Plus />}
          {pending ? 'Adding…' : 'Add device'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
