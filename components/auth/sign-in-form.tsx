'use client';

import { useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type { SupabasePublicConfig } from '@/lib/supabase/config';
import { readFormText } from '@/lib/form-data';
import { FormMessage } from './form-message';
import { TurnstileChallenge } from './turnstile-challenge';

type SignInFormProps = {
  supabaseConfig: SupabasePublicConfig | null;
  nextPath: string;
  turnstileSiteKey?: string | null;
};

export function SignInForm({
  supabaseConfig,
  nextPath,
  turnstileSiteKey = null,
}: SignInFormProps) {
  const configured = Boolean(supabaseConfig);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = readFormText(form, 'email').trim();
    const password = readFormText(form, 'password');

    if (turnstileSiteKey && !captchaToken) {
      setError('Complete the security check before signing in.');
      setPending(false);
      return;
    }

    try {
      if (!supabaseConfig) throw new Error('Supabase is not configured.');
      const supabase = createClient(supabaseConfig);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: turnstileSiteKey ? { captchaToken } : undefined,
      });
      if (signInError) throw signInError;

      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;

      const target =
        assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2'
          ? `/mfa?next=${encodeURIComponent(nextPath)}`
          : nextPath;
      window.location.assign(target);
    } catch (signInError) {
      const message =
        signInError instanceof Error
          ? signInError.message
          : 'Unable to sign in. Please try again.';
      setError(
        message === 'Invalid login credentials'
          ? 'The email or password is incorrect.'
          : message,
      );
      setPending(false);
      setCaptchaToken('');
      setCaptchaResetKey((key) => key + 1);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {!configured ? (
        <FormMessage tone="info">
          Authentication is ready for configuration. Add the Supabase public URL
          and anon key to the dashboard environment.
        </FormMessage>
      ) : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
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
      <div className="auth-field">
        <div className="auth-field-row">
          <label htmlFor="password">Password</label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <div className="password-input">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            disabled={!configured || pending}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            disabled={!configured || pending}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>
      <TurnstileChallenge
        siteKey={turnstileSiteKey}
        action="signin"
        resetKey={captchaResetKey}
        onToken={setCaptchaToken}
      />
      <Button
        type="submit"
        className="auth-submit"
        disabled={!configured || pending}
      >
        {pending ? (
          <>
            <LoaderCircle className="auth-spinner" />
            Signing in…
          </>
        ) : (
          <>
            Sign in <ArrowRight />
          </>
        )}
      </Button>
      <p className="auth-help">
        New to Notificator?{' '}
        <Link
          href={
            nextPath === '/'
              ? '/register'
              : `/register?next=${encodeURIComponent(nextPath)}`
          }
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
