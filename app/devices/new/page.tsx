import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AddDeviceForm } from '@/components/dashboard/add-device-form';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { requireUser } from '@/lib/auth/session';
import { loadDashboardShellOverview } from '@/lib/dashboard/overview';

export const dynamic = 'force-dynamic';

export default async function NewDevicePage() {
  const user = await requireUser('/devices/new');
  const overview = await loadDashboardShellOverview(user);
  return (
    <DashboardShell
      activePath="/devices"
      overview={overview}
      eyebrow="PHYSICAL DELIVERY"
      title="Add device"
      description="Connect a supported Notificator device to this account."
    >
      <Link href="/devices" className="page-back-link">
        <ArrowLeft /> Back to devices
      </Link>
      <AddDeviceForm />
    </DashboardShell>
  );
}
