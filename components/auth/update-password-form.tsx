'use client';

import { useState, type SyntheticEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type { SupabasePublicConfig } from '@/lib/supabase/config';
import { readFormText } from '@/lib/form-data';
import { FormMessage } from './form-message';

export function UpdatePasswordForm({
  supabaseConfig,
}: {
  supabaseConfig: SupabasePublicConfig | null;
}) {
  const configured = Boolean(supabaseConfig);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const password = readFormText(form, 'password');
    const confirmation = readFormText(form, 'confirmation');
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      setPending(false);
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      setPending(false);
      return;
    }
    try {
      if (!supabaseConfig) throw new Error('Supabase is not configured.');
      const supabase = createClient(supabaseConfig);
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setSaved(true);
      window.setTimeout(() => window.location.assign('/'), 900);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to update your password.',
      );
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {!configured ? (
        <FormMessage tone="info">
          Add the Supabase public configuration before testing password updates.
        </FormMessage>
      ) : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {saved ? (
        <FormMessage tone="success">
          Password updated. Returning to your dashboard…
        </FormMessage>
      ) : null}
      <div className="auth-field">
        <label htmlFor="password">New password</label>
        <div className="password-input">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            required
            disabled={!configured || pending || saved}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
            disabled={!configured || pending}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>
      <div className="auth-field">
        <label htmlFor="confirmation">Confirm new password</label>
        <Input
          id="confirmation"
          name="confirmation"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Repeat your new password"
          minLength={8}
          required
          disabled={!configured || pending || saved}
        />
      </div>
      <Button
        type="submit"
        className="auth-submit"
        disabled={!configured || pending || saved}
      >
        {pending ? (
          <>
            <LoaderCircle className="auth-spinner" />
            Updating…
          </>
        ) : (
          <>
            Update password <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}
