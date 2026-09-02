'use client';

import { useState, type SyntheticEvent } from 'react';
import { LoaderCircle, Save } from 'lucide-react';
import { FormMessage } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readFormText } from '@/lib/form-data';

export function AccountForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: readFormText(form, 'firstName').trim(),
        lastName: readFormText(form, 'lastName').trim(),
      }),
    });
    setMessage(response.ok ? 'Profile saved.' : 'Profile could not be saved.');
    setPending(false);
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      {message ? (
        <FormMessage tone={message === 'Profile saved.' ? 'success' : 'error'}>
          {message}
        </FormMessage>
      ) : null}
      <div className="settings-field-grid">
        <label htmlFor="account-first-name">
          First name
          <Input
            id="account-first-name"
            name="firstName"
            defaultValue={firstName}
            autoComplete="given-name"
          />
        </label>
        <label htmlFor="account-last-name">
          Last name
          <Input
            id="account-last-name"
            name="lastName"
            defaultValue={lastName}
            autoComplete="family-name"
          />
        </label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="auth-spinner" /> : <Save />}
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
