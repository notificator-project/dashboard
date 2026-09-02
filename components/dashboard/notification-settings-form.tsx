'use client';

import { useState, type SyntheticEvent } from 'react';
import { LoaderCircle, Save } from 'lucide-react';
import { FormMessage } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';

export function NotificationSettingsForm({
  emailEnabled,
}: {
  emailEnabled: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        emailNotifications: form.get('emailNotifications') === 'on',
      }),
    });
    setMessage(
      response.ok ? 'Preferences saved.' : 'Preferences could not be saved.',
    );
    setPending(false);
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      {message ? (
        <FormMessage
          tone={message === 'Preferences saved.' ? 'success' : 'error'}
        >
          {message}
        </FormMessage>
      ) : null}
      <label
        className="settings-toggle"
        htmlFor="email-notifications"
        aria-label="Email alert delivery"
      >
        <span>
          <strong>Email alerts</strong>
          <small>Send connected alerts to your account email.</small>
        </span>
        <input
          id="email-notifications"
          type="checkbox"
          name="emailNotifications"
          defaultChecked={emailEnabled}
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="auth-spinner" /> : <Save />}
        {pending ? 'Saving…' : 'Save preferences'}
      </Button>
    </form>
  );
}
