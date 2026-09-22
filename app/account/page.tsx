import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { AccountForm } from '@/components/dashboard/account-form';
import {
  AccountEmailForm,
  AccountPasswordForm,
  AccountSecurityForm,
} from '@/components/dashboard/account-security-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/session';
import { loadDashboardShellOverview } from '@/lib/dashboard/overview';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUser('/account');
  const supabase = await createClient();
  const [overview, { data: profile }, { data: factors }] = await Promise.all([
    loadDashboardShellOverview(user),
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.auth.mfa.listFactors(),
  ]);
  const mfaEnabled = Boolean(
    factors?.totp.some((factor) => factor.status === 'verified'),
  );
  const createdAt = user.created_at ? new Date(user.created_at) : null;
  const memberSince =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? new Intl.DateTimeFormat('en', {
          month: 'short',
          year: 'numeric',
        }).format(createdAt)
      : null;
  return (
    <DashboardShell
      activePath="/account"
      overview={overview}
      eyebrow="YOUR ACCOUNT"
      title="Profile and security"
      description="Manage the identity shared by the dashboard and mobile app."
    >
      <div className="settings-page-grid account-page-grid">
        <Card className="page-card">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="account-identity">
              <span className="account-avatar" aria-hidden="true">
                {overview.avatarUrl ? (
                  <Image
                    src={overview.avatarUrl}
                    alt=""
                    width={80}
                    height={80}
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                ) : (
                  overview.initials
                )}
              </span>
              <div>
                <strong>{overview.displayName}</strong>
                <span>{user.email}</span>
                <small>
                  {memberSince ? `Member since ${memberSince} · ` : ''}
                  Profile image by Gravatar
                </small>
              </div>
            </div>
            <AccountForm
              firstName={profile?.first_name || ''}
              lastName={profile?.last_name || ''}
            />
            <AccountEmailForm
              email={user.email || ''}
              supabaseConfig={getSupabasePublicConfig()}
            />
          </CardContent>
        </Card>
        <Card className="page-card">
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="security-summary">
            <div className={`security-mfa-row ${mfaEnabled ? 'enabled' : 'disabled'}`}>
              <div className="security-mfa-status">
                <i aria-hidden="true" />
                <span>
                  <strong>Two-factor authentication</strong>
                  <small>
                    {mfaEnabled
                      ? 'Authenticator protection is active.'
                      : 'No authenticator is protecting this account.'}
                  </small>
                </span>
              </div>
              <span
                className={`security-status-pill ${mfaEnabled ? 'enabled' : 'disabled'}`}
              >
                <i aria-hidden="true" />
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="security-note">
              <ShieldCheck />
              <span>
                Authentication and MFA are managed by the same Supabase account
                used on mobile.
              </span>
            </div>
            <AccountSecurityForm
              mfaEnabled={mfaEnabled}
              supabaseConfig={getSupabasePublicConfig()}
            />
            <AccountPasswordForm supabaseConfig={getSupabasePublicConfig()} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
