'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { createClient } from '@/lib/supabase/client';
import type { SupabasePublicConfig } from '@/lib/supabase/config';
import { FormMessage } from './form-message';

export function MfaForm({
  supabaseConfig,
  nextPath,
}: {
  supabaseConfig: SupabasePublicConfig | null;
  nextPath: string;
}) {
  const configured = Boolean(supabaseConfig);
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabaseConfig) return;
    const supabase = createClient(supabaseConfig);
    void supabase.auth.mfa
      .listFactors()
      .then(({ data, error: factorError }) => {
        const verifiedFactor = data?.totp.find(
          (factor) => factor.status === 'verified',
        );
        if (factorError) setError(factorError.message);
        else if (!verifiedFactor)
          setError('No verified authenticator was found for this account.');
        else setFactorId(verifiedFactor.id);
        setLoading(false);
      });
  }, [supabaseConfig]);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || code.length !== 6) return;
    setPending(true);
    setError('');
    try {
      if (!supabaseConfig) throw new Error('Supabase is not configured.');
      const supabase = createClient(supabaseConfig);
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;
      window.location.assign(nextPath);
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : 'The verification code could not be confirmed.',
      );
      setPending(false);
      setCode('');
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {!configured ? (
        <FormMessage tone="info">
          Add the Supabase public configuration before testing two-step
          verification.
        </FormMessage>
      ) : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <div className="auth-field otp-field">
        <label htmlFor="mfa-code">Six-digit code</label>
        <InputOTP
          id="mfa-code"
          maxLength={6}
          value={code}
          onChange={setCode}
          inputMode="numeric"
          autoComplete="one-time-code"
          disabled={!configured || loading || pending}
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="auth-otp-slot"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <small>Open your authenticator app and enter the current code.</small>
      </div>
      <Button
        type="submit"
        className="auth-submit"
        disabled={
          !configured || loading || pending || !factorId || code.length !== 6
        }
      >
        {pending || loading ? (
          <>
            <LoaderCircle className="auth-spinner" />
            {loading ? 'Preparing…' : 'Verifying…'}
          </>
        ) : (
          <>
            Verify and continue <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}
