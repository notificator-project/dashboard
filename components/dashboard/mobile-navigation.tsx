'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CircleUserRound,
  KeyRound,
  LayoutDashboard,
  Menu,
  MonitorSmartphone,
  Settings,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { SupabasePublicConfig } from '@/lib/supabase/config';

const navigation = [
  { label: 'Overview', icon: LayoutDashboard, href: '/' },
  { label: 'Notifications', icon: Bell, href: '/notifications' },
  { label: 'Devices', icon: MonitorSmartphone, href: '/devices' },
  { label: 'API keys', icon: KeyRound, href: '/api-keys' },
  { label: 'Account', icon: CircleUserRound, href: '/account' },
];

export function MobileNavigation({
  activePath,
  unreadCount,
  supabaseConfig,
}: {
  activePath: string;
  unreadCount: number;
  supabaseConfig: SupabasePublicConfig;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="mobile-navigation-sheet">
          <SheetHeader className="mobile-navigation-heading">
            <BrandLogo />
            <div>
              <SheetTitle>Notificator</SheetTitle>
              <SheetDescription>Dashboard navigation</SheetDescription>
            </div>
          </SheetHeader>
          <nav
            className="mobile-navigation-links"
            aria-label="Mobile navigation"
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
                  onClick={() => setOpen(false)}
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
          <div className="mobile-navigation-footer">
            <Link
              href="/settings"
              className={activePath === '/settings' ? 'active' : undefined}
              aria-current={activePath === '/settings' ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <Settings />
              <span>Settings</span>
            </Link>
            <SignOutButton supabaseConfig={supabaseConfig} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
