import {
  Activity,
  Bell,
  ChevronRight,
  KeyRound,
  Mail,
  MonitorSmartphone,
  Smartphone,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BrandLogo } from '@/components/brand-logo';
import { DashboardHeartbeat } from '@/components/dashboard/dashboard-heartbeat';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { DeviceStatusHeartbeat } from '@/components/dashboard/device-status-heartbeat';
import { MobileNavigation } from '@/components/dashboard/mobile-navigation';
import { OverviewDateTime } from '@/components/dashboard/overview-date-time';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { requireUser } from '@/lib/auth/session';
import { loadDashboardOverview } from '@/lib/dashboard/overview';
import { requireSupabasePublicConfig } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await requireUser('/');
  const overview = await loadDashboardOverview(user);
  const supabaseConfig = requireSupabasePublicConfig();
  const deliveryChannels = [
    {
      label: 'Integration access',
      detail:
        overview.activeApiKeyCount === 1
          ? '1 active API key'
          : `${overview.activeApiKeyCount} active API keys`,
      ready: overview.activeApiKeyCount > 0,
      action: overview.activeApiKeyCount > 0 ? 'Manage' : 'Create key',
      href: '/api-keys',
      icon: KeyRound,
    },
    {
      label: 'Mobile push',
      detail: overview.activeDestinations.includes('Push')
        ? 'Registered for this account'
        : 'Enable from the mobile app',
      ready: overview.activeDestinations.includes('Push'),
      action: 'Account',
      href: '/account',
      icon: Smartphone,
    },
    {
      label: 'Email alerts',
      detail: overview.activeDestinations.includes('Email')
        ? 'Enabled for new alerts'
        : 'Currently turned off',
      ready: overview.activeDestinations.includes('Email'),
      action: 'Configure',
      href: '/settings',
      icon: Mail,
    },
    {
      label: 'Physical devices',
      detail:
        overview.deviceCount > 0
          ? `${overview.onlineDeviceCount} of ${overview.deviceCount} online`
          : 'No devices connected',
      ready: overview.deviceCount > 0,
      action: overview.deviceCount > 0 ? 'View devices' : 'Add device',
      href: overview.deviceCount > 0 ? '/devices' : '/devices/new',
      icon: MonitorSmartphone,
    },
  ];
  const readyDeliveryChannels = deliveryChannels.filter(
    (channel) => channel.ready,
  ).length;

  return (
    <div className="dashboard-shell">
      <DashboardHeartbeat notifications={overview.notifications} />
      <DeviceStatusHeartbeat userId={overview.userId} />
      <DashboardSidebar
        activePath="/"
        unreadCount={overview.unreadCount}
        supabaseConfig={supabaseConfig}
        statusTitle="All systems operational"
        statusDescription="Last checked just now"
      />

      <main className="workspace" id="main-content" tabIndex={-1}>
        <header className="mobile-header">
          <Link href="/" className="sidebar-brand">
            <BrandLogo />
            <strong>Notificator</strong>
          </Link>
          <MobileNavigation
            activePath="/"
            unreadCount={overview.unreadCount}
            supabaseConfig={supabaseConfig}
          />
        </header>
        <div className="topbar">
          <div>
            <OverviewDateTime
              dateLabel={overview.dateLabel}
              initialTimeLabel={overview.timeLabel}
            />
            <h1>
              {overview.greeting}, {overview.displayName}.
            </h1>
            <p>Your connected alerts and devices, at a glance.</p>
          </div>
          <div className="topbar-actions">
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

        <div className="content-grid">
          <section className="metric-grid" aria-label="Account summary">
            {[
              [
                Bell,
                'Unread alerts',
                String(overview.unreadCount),
                `${overview.totalNotifications} stored alerts`,
                overview.unreadCount > 0 ? 'attention' : 'healthy',
              ],
              [
                MonitorSmartphone,
                'Connected devices',
                String(overview.deviceCount),
                `${overview.onlineDeviceCount} online now`,
                overview.onlineDeviceCount > 0 ? 'healthy' : '',
              ],
              [
                KeyRound,
                'Active API keys',
                String(overview.activeApiKeyCount),
                overview.activeApiKeyCount === 1
                  ? 'Ready for 1 integration'
                  : `Ready for ${overview.activeApiKeyCount} integrations`,
                '',
              ],
              [
                Activity,
                'Active destinations',
                String(overview.activeDestinations.length),
                overview.activeDestinations.join(', ') || 'None configured yet',
                overview.activeDestinations.length > 0 ? 'healthy' : '',
              ],
            ].map(([Icon, label, value, detail, state], index) => (
              <Card
                key={String(label)}
                className={`metric-card ${index === 0 ? 'metric-card-primary' : ''}`}
              >
                <CardHeader>
                  <div className="metric-icon">
                    <Icon />
                  </div>
                  <CardDescription>{String(label)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <strong>{String(value)}</strong>
                  <span>
                    {state ? <i className={String(state)} /> : null}
                    {String(detail)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card className="activity-card">
            <CardHeader className="section-heading">
              <div>
                <CardTitle>Recent notifications</CardTitle>
                <CardDescription>
                  Your latest events across every integration.
                </CardDescription>
              </div>
              <Link
                href="/notifications"
                className={buttonVariants({ variant: 'ghost' })}
              >
                View inbox <ChevronRight />
              </Link>
            </CardHeader>
            <CardContent className="notification-list">
              {overview.notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={notification.unread ? 'unread' : undefined}
                >
                  <span
                    className={`severity severity-${notification.severity.toLowerCase()}`}
                  >
                    <Bell />
                  </span>
                  <div className="notification-copy">
                    <div>
                      <h3>
                        <Link href={`/notifications/${notification.id}`}>
                          {notification.title}
                        </Link>
                      </h3>
                      {notification.unread ? (
                        <>
                          <i aria-hidden="true" />
                          <span className="sr-only">Unread</span>
                        </>
                      ) : null}
                    </div>
                    <p>{notification.source}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`severity-label ${notification.severity.toLowerCase()}`}
                  >
                    {notification.severity}
                  </Badge>
                  <time>{notification.time}</time>
                  <Link
                    className={buttonVariants({
                      variant: 'ghost',
                      size: 'icon',
                    })}
                    aria-label={`Open ${notification.title}`}
                    href={`/notifications/${notification.id}`}
                  >
                    <ChevronRight />
                  </Link>
                </article>
              ))}
              {overview.notifications.length === 0 ? (
                <div className="dashboard-empty-state">
                  <Bell />
                  <div>
                    <strong>No notifications yet</strong>
                    <span>Your latest connected events will appear here.</span>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="lower-grid">
            <Card className="devices-card">
              <CardHeader className="section-heading">
                <div>
                  <CardTitle>Device pulse</CardTitle>
                  <CardDescription>
                    Live state of your physical displays.
                  </CardDescription>
                </div>
                <Link
                  className={buttonVariants({
                    variant: 'ghost',
                    size: 'icon',
                  })}
                  aria-label="View all devices"
                  href="/devices"
                >
                  <ChevronRight />
                </Link>
              </CardHeader>
              <CardContent className="device-list">
                {overview.devices.map((device) => (
                  <div key={device.id}>
                    <span className="device-icon">
                      <Smartphone />
                    </span>
                    <div>
                      <strong>{device.name}</strong>
                      <span>
                        {device.type} · synced {device.lastSynced}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={device.status.toLowerCase()}
                    >
                      <i /> {device.status}
                    </Badge>
                  </div>
                ))}
                {overview.devices.length === 0 ? (
                  <div className="dashboard-empty-state compact">
                    <MonitorSmartphone />
                    <div>
                      <strong>No connected devices</strong>
                      <span>Add a supported display when you are ready.</span>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card className="integrations-card">
              <CardHeader className="section-heading">
                <div>
                  <CardTitle>Delivery setup</CardTitle>
                  <CardDescription>
                    See what is ready and fix what is missing.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={
                    readyDeliveryChannels === deliveryChannels.length
                      ? 'delivery-ready'
                      : 'delivery-partial'
                  }
                >
                  {readyDeliveryChannels}/{deliveryChannels.length} ready
                </Badge>
              </CardHeader>
              <CardContent className="delivery-channel-list">
                {deliveryChannels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <Link href={channel.href} key={channel.label}>
                      <span className="delivery-channel-icon">
                        <Icon />
                      </span>
                      <span className="delivery-channel-copy">
                        <strong>{channel.label}</strong>
                        <small>{channel.detail}</small>
                      </span>
                      <span
                        className={
                          channel.ready
                            ? 'delivery-channel-state ready'
                            : 'delivery-channel-state'
                        }
                      >
                        <i /> {channel.ready ? 'Ready' : 'Needs setup'}
                      </span>
                      <span className="delivery-channel-action">
                        {channel.action} <ChevronRight />
                      </span>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </div>
          {overview.degraded ? (
            <output className="overview-data-notice">
              Some account data could not be refreshed. Available information is
              shown above.
            </output>
          ) : null}
        </div>
      </main>
    </div>
  );
}
