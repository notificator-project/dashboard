'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, RotateCcw, ShieldCheck } from 'lucide-react';

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: 'auto';
      callback: (token: string) => void;
      'error-callback': () => void;
      'expired-callback': () => void;
      'timeout-callback': () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScript: Promise<void> | undefined;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScript) return turnstileScript;
  turnstileScript = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-notificator-turnstile]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Unable to load the security check.')),
        { once: true },
      );
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.dataset.notificatorTurnstile = 'true';
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Unable to load the security check.'));
    document.head.appendChild(script);
  });
  return turnstileScript;
}

export function TurnstileChallenge({
  siteKey,
  action,
  resetKey,
  onToken,
}: {
  siteKey: string | null;
  action: 'signin' | 'signup' | 'password-reset';
  resetKey: number;
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | undefined>(undefined);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('Checking your browser…');

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let active = true;
    setState('loading');
    setMessage('Checking your browser…');
    void loadTurnstile()
      .then(() => {
        if (!active || !containerRef.current || !window.turnstile) return;
        containerRef.current.replaceChildren();
        widgetRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'auto',
          callback: (token) => {
            if (!active) return;
            setState('ready');
            setMessage('Security check complete.');
            onToken(token);
          },
          'error-callback': () => {
            if (!active) return;
            setState('error');
            setMessage('The security check could not be completed. Try again.');
            onToken('');
          },
          'expired-callback': () => {
            if (!active) return;
            setState('error');
            setMessage('The security check expired. Try again.');
            onToken('');
          },
          'timeout-callback': () => {
            if (!active) return;
            setState('error');
            setMessage('The security check timed out. Try again.');
            onToken('');
          },
        });
      })
      .catch(() => {
        if (!active) return;
        setState('error');
        setMessage(
          'The security check could not be loaded. Check your connection.',
        );
        onToken('');
      });
    return () => {
      active = false;
      if (widgetRef.current && window.turnstile)
        window.turnstile.reset(widgetRef.current);
    };
  }, [action, onToken, resetKey, siteKey]);

  if (!siteKey) return null;
  return (
    <div className="turnstile-challenge" aria-live="polite">
      <div ref={containerRef} />
      <p
        className={
          state === 'error' ? 'turnstile-status error' : 'turnstile-status'
        }
      >
        {state === 'loading' ? (
          <LoaderCircle className="auth-spinner" aria-hidden="true" />
        ) : state === 'error' ? (
          <RotateCcw aria-hidden="true" />
        ) : (
          <ShieldCheck aria-hidden="true" />
        )}
        <span>{message}</span>
      </p>
    </div>
  );
}
