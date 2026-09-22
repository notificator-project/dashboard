'use client';

import Image from 'next/image';
import { useState, type SyntheticEvent } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldOff,
} from 'lucide-react';
import { FormMessage } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type { SupabasePublicConfig } from '@/lib/supabase/config';
import { readFormText } from '@/lib/form-data';

export function AccountEmailForm({
  email,
  supabaseConfig,
}: {
  email: string;
  supabaseConfig: SupabasePublicConfig | null;
}) {
  const [nextEmail, setNextEmail] = useState(email);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');

  async function updateEmail() {
    const value = nextEmail.trim();
    if (!value || value === email) {
      setMessage('Enter a different email address.');
      setMessageTone('error');
      return;
    }
    setPending(true);
    setMessage('');
    try {
      if (!supabaseConfig) throw new Error('Supabase is not configured.');
      const supabase = createClient(supabaseConfig);
      const redirectTo = `${window.location.origin}/auth/callback?next=/account`;
      const { error } = await supabase.auth.updateUser(
        { email: value },
        { emailRedirectTo: redirectTo.toString() },
      );
      if (error) throw error;
      setMessage('Check both inboxes to confirm your new email address.');
      setMessageTone('success');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'The email address could not be updated.',
      );
      setMessageTone('error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="account-email-form pt-2">
      <div className="account-security-title">
        <Mail aria-hidden="true" />
        <strong>Email address</strong>
      </div>
      <p>Changing your email requires confirmation before it becomes active.</p>
      {message ? <FormMessage tone={messageTone}>{message}</FormMessage> : null}
      <div className="account-security-email">
        <Input
          type="email"
          value={nextEmail}
          onChange={(event) => setNextEmail(event.target.value)}
          autoComplete="email"
          aria-label="Account email address"
          disabled={!supabaseConfig || pending}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void updateEmail()}
          disabled={!supabaseConfig || pending || nextEmail.trim() === email}
        >
          {pending ? <LoaderCircle className="auth-spinner" /> : null}
          {pending ? 'Updating…' : 'Change email'}
        </Button>
      </div>
    </div>
  );
}

export function AccountSecurityForm({
  mfaEnabled,
  supabaseConfig,
}: {
  mfaEnabled: boolean;
  supabaseConfig: SupabasePublicConfig | null;
}) {
  const [mfaPending, setMfaPending] = useState(false);
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');

  function showMessage(text: string, tone: 'success' | 'error') {
    setMessage(text);
    setMessageTone(tone);
  }

  async function disableMfa() {
    if (
      !window.confirm(
        'Disable two-factor authentication? Your account will no longer require an authenticator code when signing in.',
      )
    )
      return;
    setMfaPending(true);
    setMessage('');
    try {
      if (!supabaseConfig) throw new Error('Supabase is not configured.');
      const supabase = createClient(supabaseConfig);
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const factor = data?.totp.find((item) => item.status === 'verified');
      if (!factor) throw new Error('No verified authenticator was found.');
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });
      if (error) throw error;
      showMessage('Two-factor authentication has been disabled.', 'success');
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : 'Two-factor authentication could not be disabled.',
        'error',
      );
      setMfaPending(false);
    }
  }

  async function beginEnrollment() {
    setMfaPending(true);
    setMessage('');
    try {
      if (!supabaseConfig) throw new Error('Supabase is not configured.');
      const supabase = createClient(supabaseConfig);
      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      for (const factor of factors?.all ?? []) {
        if (factor.status === 'unverified') {
          const { error: cleanupError } = await supabase.auth.mfa.unenroll({
            factorId: factor.id,
          });
          if (cleanupError) throw cleanupError;
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Notificator dashboard',
        issuer: 'Notificator',
      });
      if (error) throw error;
      if (!data.totp) throw new Error('The authenticator setup could not start.');
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : '';
      showMessage(
        /mfa_totp_enroll_not_enabled|generating qr/i.test(rawMessage)
          ? 'TOTP enrollment is disabled for this Supabase project. Enable TOTP enrollment and verification in Supabase Auth settings, then try again.'
          : rawMessage || 'The authenticator setup could not start.',
        'error',
      );
    } finally {
      setMfaPending(false);
    }
  }

  async function verifyEnrollment() {
    if (!enrollment || code.length !== 6) return;
    setMfaPending(true);
    setMessage('');
    try {
      if (!supabaseConfig) throw new Error('Supabase is not configured.');
      const supabase = createClient(supabaseConfig);
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: enrollment.factorId });
      if (challengeError) throw challengeError;
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challenge.id,
        code,
      });
      if (error) throw error;
      showMessage('Two-factor authentication is now enabled.', 'success');
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : 'The verification code could not be confirmed.',
        'error',
      );
      setCode('');
      setMfaPending(false);
    }
  }

  return (
    <div className="account-security-form">
      {message ? <FormMessage tone={messageTone}>{message}</FormMessage> : null}
      <div className="account-security-section account-mfa-section">
        <div className="account-security-copy">
          <div className="account-security-title">
            <ShieldOff aria-hidden="true" />
            <strong>Two-factor authentication</strong>
          </div>
          <p>
            {mfaEnabled
              ? 'Your account is protected by an authenticator app.'
              : 'Add an authenticator app here or from the mobile app to protect your account.'}
          </p>
        </div>
        {mfaEnabled ? (
          <Button
            type="button"
            variant="outline"
            className="account-disable-mfa"
            onClick={() => void disableMfa()}
            disabled={!supabaseConfig || mfaPending}
          >
            {mfaPending ? <LoaderCircle className="auth-spinner" /> : null}
            {mfaPending ? 'Disabling…' : 'Disable 2FA'}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => void beginEnrollment()}
            disabled={!supabaseConfig || mfaPending || Boolean(enrollment)}
          >
            {mfaPending ? <LoaderCircle className="auth-spinner" /> : null}
            {mfaPending ? 'Preparing…' : 'Enable 2FA'}
          </Button>
        )}
      </div>
      {!mfaEnabled && enrollment ? (
        <div className="account-mfa-enrollment">
          <div>
            <strong>Scan this code with your authenticator app</strong>
            <p>Then enter the six-digit code it generates to finish setup.</p>
          </div>
          <Image
            src={enrollment.qrCode}
            alt="Two-factor setup QR code"
            width={154}
            height={154}
            unoptimized
          />
          <div className="account-mfa-secret">
            <span>Can’t scan? Enter this setup key manually.</span>
            <code>{enrollment.secret}</code>
          </div>
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            inputMode="numeric"
            autoComplete="one-time-code"
            disabled={mfaPending}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button
            type="button"
            onClick={() => void verifyEnrollment()}
            disabled={mfaPending || code.length !== 6}
          >
            {mfaPending ? 'Verifying…' : 'Verify and enable 2FA'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function AccountPasswordForm({
  supabaseConfig,
}: {
  supabaseConfig: SupabasePublicConfig | null;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = readFormText(form, 'currentPassword');
    const password = readFormText(form, 'password');
    const confirmation = readFormText(form, 'confirmation');
    setMessage('');
    if (!currentPassword) {
      setMessage('Enter your current password.');
      setMessageTone('error');
      return;
    }
    if (password.length < 8) {
      setMessage('Use at least 8 characters.');
      setMessageTone('error');
      return;
    }
    if (password !== confirmation) {
      setMessage('The passwords do not match.');
      setMessageTone('error');
      return;
    }
    setPending(true);
    try {
      if (!supabaseConfig) throw new Error('Supabase is not configured.');
      const supabase = createClient(supabaseConfig);
      const { error } = await supabase.auth.updateUser({
        password,
        current_password: currentPassword,
      });
      if (error) throw error;
      formElement.reset();
      setMessage('Password updated successfully.');
      setMessageTone('success');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'The password could not be updated.',
      );
      setMessageTone('error');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="account-password-form" onSubmit={submit}>
      <div className="account-security-title">
        <KeyRound aria-hidden="true" />
        <strong>Change password</strong>
      </div>
      <p>Use a unique password with at least eight characters.</p>
      {message ? <FormMessage tone={messageTone}>{message}</FormMessage> : null}
      <div className="account-password-fields">
        <label className="account-password-current" htmlFor="account-current-password">
          Current password
          <Input
            id="account-current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            disabled={!supabaseConfig || pending}
          />
        </label>
        <label htmlFor="account-new-password">
          New password
          <span className="account-password-input">
            <Input
              id="account-new-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              required
              disabled={!supabaseConfig || pending}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={!supabaseConfig || pending}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </span>
        </label>
        <label htmlFor="account-password-confirmation">
          Confirm password
          <Input
            id="account-password-confirmation"
            name="confirmation"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={!supabaseConfig || pending}
          />
        </label>
      </div>
      <Button type="submit" variant="outline" disabled={!supabaseConfig || pending}>
        {pending ? <LoaderCircle className="auth-spinner" /> : null}
        {pending ? 'Updating…' : 'Change password'}
      </Button>
    </form>
  );
}
