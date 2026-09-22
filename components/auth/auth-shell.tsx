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
          <p className="auth-kicker">YOUR NOTIFICATOR CONTROL ROOM</p>
          <p className="auth-story-title">See what matters. Stay in control.</p>
          <p>
            Bring your alerts, integrations, and connected devices into one calm
            place — with the same Notificator account you use on mobile.
          </p>
          <ul>
            <li>
              <BellRing />
              <span>
                <strong>Find the signal</strong>
                <small>See what needs attention without the noise.</small>
              </span>
            </li>
            <li>
              <KeyRound />
              <span>
                <strong>Connect your stack</strong>
                <small>Manage API keys and delivery from one place.</small>
              </span>
            </li>
            <li>
              <MonitorSmartphone />
              <span>
                <strong>Watch your devices</strong>
                <small>Know which displays are online and ready.</small>
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
