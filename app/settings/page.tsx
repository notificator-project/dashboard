import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { MqttSettingsForm } from '@/components/dashboard/mqtt-settings-form';
import { NotificationSettingsForm } from '@/components/dashboard/notification-settings-form';
import { ToastSettingsForm } from '@/components/dashboard/toast-settings-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/session';
import { loadDashboardShellOverview } from '@/lib/dashboard/overview';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser('/settings');
  const supabase = await createClient();
  const [overview, { data: profile }] = await Promise.all([
    loadDashboardShellOverview(user),
    supabase
      .from('profiles')
      .select('email_notifications')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);
  return (
    <DashboardShell
      activePath="/settings"
      overview={overview}
      eyebrow="PREFERENCES"
      title="Settings"
      description="Choose how Notificator reaches you and connects to devices."
    >
      <div className="settings-masonry-grid">
        <div className="settings-masonry-column">
          <Card className="page-card">
            <CardHeader>
              <CardTitle>Alert delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationSettingsForm
                emailEnabled={profile?.email_notifications !== false}
              />
            </CardContent>
          </Card>
          <Card className="page-card">
            <CardHeader>
              <CardTitle>Dashboard notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <ToastSettingsForm />
            </CardContent>
          </Card>
        </div>
        <Card className="page-card">
          <CardHeader>
            <CardTitle>Device connection</CardTitle>
          </CardHeader>
          <CardContent>
            <MqttSettingsForm userId={user.id} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
