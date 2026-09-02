'use client';

import { useState, type SyntheticEvent } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type { SupabasePublicConfig } from '@/lib/supabase/config';
import { readFormText } from '@/lib/form-data';
import { FormMessage } from './form-message';

export function RecoveryForm({
  supabaseConfig,
}: {
  supabaseConfig: SupabasePublicConfig | null;
}) {
  const configured = Boolean(supabaseConfig);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setSent(false);
    const email = readFormText(
      new FormData(event.currentTarget),
      'email',
    ).trim();
    try {
      if (!supabaseConfig) throw new Error('Supabase is not configured.');
      const supabase = createClient(supabaseConfig);
      const redirectTo = `${window.location.origin}/auth/callback?next=/update-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo },
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'Unable to send the recovery email.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {!configured ? (
        <FormMessage tone="info">
          Add the Supabase public configuration before testing password
          recovery.
        </FormMessage>
      ) : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {sent ? (
        <FormMessage tone="success">
          Check your inbox. If an account exists for that address, a secure
          reset link is on its way.
        </FormMessage>
      ) : null}
      <div className="auth-field">
        <label htmlFor="email">Email address</label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={!configured || pending}
        />
      </div>
      <Button
        type="submit"
        className="auth-submit"
        disabled={!configured || pending}
      >
        {pending ? (
          <>
            <LoaderCircle className="auth-spinner" />
            Sending…
          </>
        ) : (
          <>
            Send reset link <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}
