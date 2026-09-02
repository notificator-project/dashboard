'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Bell,
  CircleUserRound,
  KeyRound,
  LayoutDashboard,
  MonitorSmartphone,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { SignOutButton } from '@/components/auth/sign-out-button';
import type { SupabasePublicConfig } from '@/lib/supabase/config';

const preferenceKey = 'notificator_dashboard_sidebar_collapsed';
const preferenceEvent = 'notificator:sidebar-preference';

function subscribeToPreference(onStoreChange: () => void) {
  window.addEventListener(preferenceEvent, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(preferenceEvent, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function preferenceSnapshot() {
  return window.localStorage.getItem(preferenceKey) === 'true';
}

function serverPreferenceSnapshot() {
  return false;
}

const navigation = [
  { label: 'Overview', icon: LayoutDashboard, href: '/' },
  { label: 'Notifications', icon: Bell, href: '/notifications' },
  { label: 'Devices', icon: MonitorSmartphone, href: '/devices' },
  { label: 'API keys', icon: KeyRound, href: '/api-keys' },
  { label: 'Account', icon: CircleUserRound, href: '/account' },
];

export function DashboardSidebar({
  activePath,
  unreadCount,
  supabaseConfig,
  statusTitle = 'Account connected',
  statusDescription = 'Supabase session active',
}: {
  activePath: string;
  unreadCount: number;
  supabaseConfig: SupabasePublicConfig;
  statusTitle?: string;
  statusDescription?: string;
}) {
  const collapsed = useSyncExternalStore(
    subscribeToPreference,
    preferenceSnapshot,
    serverPreferenceSnapshot,
  );

  useEffect(() => {
    document.documentElement.dataset.dashboardSidebar = collapsed
      ? 'collapsed'
      : 'expanded';
  }, [collapsed]);

  function toggleSidebar() {
    window.localStorage.setItem(preferenceKey, String(!collapsed));
    window.dispatchEvent(new Event(preferenceEvent));
  }

  return (
    <aside
      className={`sidebar${collapsed ? ' collapsed' : ''}`}
      aria-label="Dashboard sidebar"
    >
      <div className="sidebar-top">
        <Link
          href="/"
          className="sidebar-brand"
          aria-label={collapsed ? 'Notificator dashboard' : undefined}
          title={collapsed ? 'Notificator dashboard' : undefined}
        >
          <BrandLogo />
          <div>
            <strong>Notificator</strong>
            <span>Dashboard</span>
          </div>
        </Link>
        <button
          type="button"
          className="sidebar-collapse-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-controls="dashboard-navigation"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={toggleSidebar}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </button>
      </div>
      <nav
        id="dashboard-navigation"
        className="sidebar-nav"
        aria-label="Dashboard navigation"
      >
        <p>Workspace</p>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.href === activePath;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? 'active' : undefined}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon />
              <span>{item.label}</span>
              {item.href === '/notifications' && unreadCount > 0 ? (
                <>
                  <span className="sr-only">
                    {unreadCount} unread notifications
                  </span>
                  <em aria-hidden="true">{unreadCount}</em>
                </>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <output
          className="connection-state"
          aria-label={
            collapsed ? `${statusTitle}. ${statusDescription}` : undefined
          }
          title={collapsed ? `${statusTitle}: ${statusDescription}` : undefined}
        >
          <span className="status-pulse" aria-hidden="true" />
          <div>
            <strong>{statusTitle}</strong>
            <span>{statusDescription}</span>
          </div>
        </output>
        <Link
          href="/settings"
          className={activePath === '/settings' ? 'active' : undefined}
          aria-current={activePath === '/settings' ? 'page' : undefined}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings />
          <span>Settings</span>
        </Link>
        <div title={collapsed ? 'Sign out' : undefined}>
          <SignOutButton supabaseConfig={supabaseConfig} />
        </div>
      </div>
    </aside>
  );
}
