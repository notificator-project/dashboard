import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { DashboardHeartbeat } from '@/components/dashboard/dashboard-heartbeat';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { DeviceStatusHeartbeat } from '@/components/dashboard/device-status-heartbeat';
import { MobileNavigation } from '@/components/dashboard/mobile-navigation';
import type { DashboardShellOverview } from '@/lib/dashboard/overview';
import { requireSupabasePublicConfig } from '@/lib/supabase/config';
import packageMetadata from '@/package.json';

type DashboardShellProps = {
  activePath: string;
  overview: DashboardShellOverview;
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
};

export function DashboardShell({
  activePath,
  overview,
  eyebrow,
  title,
  description,
  action,
  children,
}: DashboardShellProps) {
  const supabaseConfig = requireSupabasePublicConfig();
  return (
    <div className="dashboard-shell">
      <DashboardHeartbeat notifications={overview.notifications} />
      <DeviceStatusHeartbeat userId={overview.userId} />
      <DashboardSidebar
        activePath={activePath}
        unreadCount={overview.unreadCount}
        supabaseConfig={supabaseConfig}
      />

      <main className="workspace" id="main-content" tabIndex={-1}>
        <header className="mobile-header">
          <Link href="/" className="sidebar-brand">
            <BrandLogo />
            <strong>Notificator</strong>
          </Link>
          <MobileNavigation
            activePath={activePath}
            unreadCount={overview.unreadCount}
            supabaseConfig={supabaseConfig}
          />
        </header>
        <div className="topbar page-topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="topbar-actions">
            {action}
            <Link className="avatar" href="/account" aria-label="Open account">
              {overview.avatarUrl ? (
                <Image
                  src={overview.avatarUrl}
                  alt=""
                  width={42}
                  height={42}
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                overview.initials
              )}
            </Link>
          </div>
        </div>
        <div className="content-grid page-content">{children}</div>
        <footer className="dashboard-footer">
          <span>Notificator Dashboard v{packageMetadata.version}</span>
          <span className="dashboard-beta-notice">
            <strong>Beta</strong>
            <span>Features may change before the stable release.</span>
          </span>
        </footer>
      </main>
    </div>
  );
}
