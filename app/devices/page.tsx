import Link from 'next/link';
import { ChevronRight, Info, MonitorSmartphone, Plus } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/session';
import {
  loadDashboardDevices,
  loadDashboardShellOverview,
} from '@/lib/dashboard/overview';

export const dynamic = 'force-dynamic';

export default async function DevicesPage() {
  const user = await requireUser('/devices');
  const [overview, devices] = await Promise.all([
    loadDashboardShellOverview(user),
    loadDashboardDevices(user),
  ]);
  return (
    <DashboardShell
      activePath="/devices"
      overview={overview}
      eyebrow="PHYSICAL DELIVERY"
      title="Devices"
      description="Saved device presence and the last broker status synchronized to your account."
      action={
        <Link href="/devices/new" className={buttonVariants()}>
          <Plus /> Add device
        </Link>
      }
    >
      <div className="page-notice">
        <Info />
        <div>
          <strong>Device status refreshes automatically</strong>
          <p>
            With MQTT configured in Settings, the dashboard reads retained
            status while this tab is open. Paused devices remain connected to
            your account but stop receiving notifications and live commands.
          </p>
        </div>
      </div>
      <Card className="page-card">
        <CardHeader>
          <CardTitle>{devices.length} connected devices</CardTitle>
        </CardHeader>
        <CardContent className="page-device-list">
          {devices.map((device) => (
            <article key={device.id}>
              <span className="device-icon">
                <MonitorSmartphone />
              </span>
              <div>
                <strong>{device.name}</strong>
                <span>
                  {device.type} · Firmware{' '}
                  {device.firmwareVersion || 'not reported'}
                </span>
              </div>
              <div className="device-sync-copy">
                <Badge
                  variant="outline"
                  className={device.status.toLowerCase()}
                >
                  <i /> {device.status}
                </Badge>
                <small>Last synced {device.lastSynced}</small>
              </div>
              <Link
                className="row-link"
                href={`/devices/${device.id}`}
                aria-label={`Manage ${device.name}`}
              >
                <ChevronRight />
              </Link>
            </article>
          ))}
          {devices.length === 0 ? (
            <div className="dashboard-empty-state">
              <MonitorSmartphone />
              <div>
                <strong>No devices connected</strong>
                <span>Add a supported device from the mobile app.</span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
