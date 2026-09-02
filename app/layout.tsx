import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import { DashboardToaster } from '@/components/dashboard/dashboard-toaster';
import { SkipLink } from '@/components/ui/skip-link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dashboard | Notificator',
  description:
    'Manage Notificator alerts, connected devices, integrations, and account access.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SkipLink />
        {children}
        <DashboardToaster />
      </body>
    </html>
  );
}
