import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Info } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DeviceFirmwareCard } from '@/components/dashboard/device-firmware-card';
import { DevicePauseButton } from '@/components/dashboard/device-pause-button';
import { DeviceSettingsForm } from '@/components/dashboard/device-settings-form';
import { requireUser } from '@/lib/auth/session';
import {
  loadDashboardDevice,
  loadDashboardShellOverview,
} from '@/lib/dashboard/overview';

export const dynamic = 'force-dynamic';

export default async function DevicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/devices/${id}`);
  const [overview, device] = await Promise.all([
    loadDashboardShellOverview(user),
    loadDashboardDevice(user, id),
  ]);
  if (!device) notFound();

  return (
    <DashboardShell
      activePath="/devices"
      overview={overview}
      eyebrow="DEVICE SETTINGS"
      title={device.name}
      description={`${device.type} · ${device.deviceId || 'Device ID unavailable'}`}
      action={
        <div className="device-header-actions">
          <div
            className={`device-status-summary ${device.status.toLowerCase()}`}
            aria-label={`Device status: ${device.status}`}
          >
            <span className="device-status-summary-dot" aria-hidden="true">
              <i />
            </span>
            <span>
              <strong>{device.status}</strong>
              <small>Live device status</small>
            </span>
          </div>
          <DevicePauseButton
            id={device.id}
            name={device.name}
            paused={device.isPaused}
          />
        </div>
      }
    >
      <Link href="/devices" className="page-back-link">
        <ArrowLeft /> Back to devices
      </Link>
      <div className="page-notice">
        <Info />
        <div>
          <strong>Account settings and live delivery stay coordinated</strong>
          <p>
            Changes update the record shared with the mobile app and deliver
            supported clock, weather, and display commands through the MQTT
            connection saved in this browser session.
          </p>
        </div>
      </div>
      <DeviceSettingsForm device={device} userId={user.id} />
      <DeviceFirmwareCard device={device} userId={user.id} />
    </DashboardShell>
  );
}
