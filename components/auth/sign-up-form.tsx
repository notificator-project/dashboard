'use client';

import { useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readFormText } from '@/lib/form-data';
import { createClient } from '@/lib/supabase/client';
import type { SupabasePublicConfig } from '@/lib/supabase/config';
import { FormMessage } from './form-message';

type SignUpFormProps = {
  supabaseConfig: SupabasePublicConfig | null;
  nextPath: string;
};

export function SignUpForm({ supabaseConfig, nextPath }: SignUpFormProps) {
  const configured = Boolean(supabaseConfig);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = readFormText(form, 'email').trim();
    const password = readFormText(form, 'password');
    const passwordConfirmation = readFormText(form, 'passwordConfirmation');

    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      setPending(false);
      return;
    }

    if (password !== passwordConfirmation) {
      setError('The passwords do not match.');
      setPending(false);
      return;
    }

    try {
      if (!supabaseConfig) throw new Error('Supabase is not configured.');
      const supabase = createClient(supabaseConfig);
      const callback = new URL('/auth/callback', window.location.origin);
      // Keep the normal signup callback exact so Supabase can match it against
      // the production allowlist. Only protected-page signups need a return path.
      if (nextPath !== '/') callback.searchParams.set('next', nextPath);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback.toString() },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        window.location.assign(nextPath);
        return;
      }

      setSuccess(
        'Check your email to confirm your account, then return here to sign in.',
      );
      event.currentTarget.reset();
      setPending(false);
    } catch (signUpError) {
      const message =
        signUpError instanceof Error
          ? signUpError.message
          : 'Unable to create your account. Please try again.';
      setError(message);
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {!configured ? (
        <FormMessage tone="info">
          Authentication is ready for configuration. Add the Supabase public URL
          and publishable key to the dashboard environment.
        </FormMessage>
      ) : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {success ? <FormMessage tone="success">{success}</FormMessage> : null}

      <div className="auth-field">
        <label htmlFor="email">Email address</label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={!configured || pending || Boolean(success)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="password">Password</label>
        <div className="password-input">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            required
            disabled={!configured || pending || Boolean(success)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
            disabled={!configured || pending || Boolean(success)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>

      <div className="auth-field">
        <label htmlFor="passwordConfirmation">Confirm password</label>
        <Input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Enter your password again"
          minLength={8}
          required
          disabled={!configured || pending || Boolean(success)}
        />
      </div>

      <Button
        type="submit"
        className="auth-submit"
        disabled={!configured || pending || Boolean(success)}
      >
        {pending ? (
          <>
            <LoaderCircle className="auth-spinner" />
            Creating account…
          </>
        ) : (
          <>
            Create account <ArrowRight />
          </>
        )}
      </Button>

      <p className="auth-help">
        Already have an account?{' '}
        <Link
          href={
            nextPath === '/'
              ? '/sign-in'
              : `/sign-in?next=${encodeURIComponent(nextPath)}`
          }
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
