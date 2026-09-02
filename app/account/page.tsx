import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { AccountForm } from '@/components/dashboard/account-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthenticatorAssurance, requireUser } from '@/lib/auth/session';
import { loadDashboardShellOverview } from '@/lib/dashboard/overview';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUser('/account');
  const supabase = await createClient();
  const [overview, { data: profile }, assurance] = await Promise.all([
    loadDashboardShellOverview(user),
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle(),
    getAuthenticatorAssurance(supabase),
  ]);
  return (
    <DashboardShell
      activePath="/account"
      overview={overview}
      eyebrow="YOUR ACCOUNT"
      title="Profile and security"
      description="Manage the identity shared by the dashboard and mobile app."
    >
      <div className="settings-page-grid">
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
                <small>Profile image provided by Gravatar</small>
              </div>
            </div>
            <AccountForm
              firstName={profile?.first_name || ''}
              lastName={profile?.last_name || ''}
            />
          </CardContent>
        </Card>
        <Card className="page-card">
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="security-summary">
            <div>
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div>
              <span>Two-factor authentication</span>
              <Badge
                variant="outline"
                className={assurance?.nextLevel === 'aal2' ? 'active' : ''}
              >
                {assurance?.nextLevel === 'aal2' ? 'Enabled' : 'Not enabled'}
              </Badge>
            </div>
            <div className="security-note">
              <ShieldCheck />
              <span>
                Authentication and MFA are managed by the same Supabase account
                used on mobile.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
