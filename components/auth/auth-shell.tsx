import Link from 'next/link';
import {
  ArrowLeft,
  BellRing,
  KeyRound,
  MonitorSmartphone,
  ShieldCheck,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  backHref,
  backLabel = 'Back to sign in',
}: AuthShellProps) {
  return (
    <main className="auth-shell" id="main-content" tabIndex={-1}>
      <section className="auth-story">
        <Link
          href="/sign-in"
          className="auth-brand"
          aria-label="Notificator sign in"
        >
          <BrandLogo />
          <div>
            <strong>Notificator</strong>
            <small>Dashboard</small>
          </div>
        </Link>

        <div className="auth-story-copy">
          <p className="auth-kicker">ONE CONNECTED VIEW</p>
          <p className="auth-story-title">Keep meaningful events close.</p>
          <p>
            Review alerts, manage integrations, and check connected devices from
            the same Notificator account you use on mobile.
          </p>
          <ul>
            <li>
              <BellRing />
              <span>
                <strong>A focused inbox</strong>
                <small>See what needs attention without the noise.</small>
              </span>
            </li>
            <li>
              <KeyRound />
              <span>
                <strong>Safer integrations</strong>
                <small>Create and control credentials from one place.</small>
              </span>
            </li>
            <li>
              <MonitorSmartphone />
              <span>
                <strong>Device visibility</strong>
                <small>Know which physical displays are available.</small>
              </span>
            </li>
          </ul>
        </div>

        <div className="auth-trust">
          <ShieldCheck />
          <span>
            <strong>Your existing account</strong>
            <small>No separate dashboard identity.</small>
          </span>
        </div>
      </section>

      <section className="auth-workspace">
        <div className="auth-mobile-brand">
          <BrandLogo onDark={false} />
          <strong>Notificator</strong>
        </div>
        <div className="auth-card">
          {backHref ? (
            <Link href={backHref} className="auth-back">
              <ArrowLeft />
              {backLabel}
            </Link>
          ) : null}
          <p className="auth-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
        </div>
        <p className="auth-legal">
          By continuing, you agree to the Notificator{' '}
          <a
            href="https://notificator-project.com/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
            aria-label="Privacy policy (opens in a new tab)"
          >
            privacy policy
          </a>{' '}
          and terms that apply to the service.
        </p>
      </section>
    </main>
  );
}
