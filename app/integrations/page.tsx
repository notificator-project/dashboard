import {
  ArrowUpRight,
  Blocks,
  Code2,
  ExternalLink,
  Globe2,
  Package,
  Puzzle,
} from 'lucide-react';
import Link from 'next/link';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/session';
import { loadDashboardShellOverview } from '@/lib/dashboard/overview';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const integrations = [
  {
    name: 'Webflow',
    category: 'Website automation',
    description:
      'Connect Webflow form submissions to your Notificator account and manage sites, scenarios, and API-key delivery.',
    status: 'Available',
    icon: Globe2,
    href: '/integrations/webflow',
    action: 'Set up Webflow',
    resourceLabel: 'Read Webflow docs',
    resourceHref: 'https://docs.notificator-project.com/integrations/webflow/',
    accent: 'webflow',
  },
  {
    name: 'WordPress',
    category: 'CMS plugin',
    description:
      'Send WordPress events through the official plugin, with account-managed MQTT connections and API delivery.',
    status: 'Available',
    icon: Puzzle,
    href: 'https://wordpress.org/plugins/notificator-project/',
    action: 'Install plugin',
    resourceLabel: 'Read WordPress docs',
    resourceHref:
      'https://docs.notificator-project.com/integrations/wordpress/',
    accent: 'wordpress',
  },
  {
    name: 'Strapi',
    category: 'Content platform',
    description:
      'Create lifecycle rules in Strapi and forward matching content activity to Notificator.',
    status: 'Stable',
    icon: Blocks,
    href: 'https://www.npmjs.com/package/@notificator-project/strapi-extension',
    action: 'View package',
    resourceLabel: 'Read Strapi docs',
    resourceHref: 'https://docs.notificator-project.com/integrations/strapi/',
    accent: 'strapi',
  },
  {
    name: 'Astro',
    category: 'Web framework',
    description:
      'Send build, server-side, and API route notifications from Astro projects with the official package.',
    status: 'Stable',
    icon: Code2,
    href: 'https://www.npmjs.com/package/@notificator-project/astro',
    action: 'View package',
    resourceLabel: 'Read Astro docs',
    resourceHref: 'https://docs.notificator-project.com/integrations/astro/',
    accent: 'astro',
  },
  {
    name: 'Node.js SDK',
    category: 'API and server apps',
    description:
      'Use the Notificator API from Node.js services, scripts, and custom integrations with account MQTT support.',
    status: 'Stable',
    icon: Package,
    href: 'https://www.npmjs.com/package/@notificator-project/api',
    action: 'View package',
    resourceLabel: 'Read SDK docs',
    resourceHref: 'https://docs.notificator-project.com/integrations/node-sdk/',
    accent: 'sdk',
  },
];

export default async function IntegrationsPage() {
  const user = await requireUser('/integrations');
  const supabase = await createClient();
  const [overview, webflowResult] = await Promise.all([
    loadDashboardShellOverview(user),
    supabase
      .from('webflow_integrations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'connected'),
  ]);
  const webflowConnected = (webflowResult.count || 0) > 0;

  return (
    <DashboardShell
      activePath="/integrations"
      overview={overview}
      eyebrow="CONNECT YOUR STACK"
      title="Integrations"
      description="Connect your tools, sites, and server apps to one notification workflow."
    >
      <Card className="integrations-page-intro">
        <CardContent>
          <div>
            <strong>One account, every delivery path</strong>
            <p>
              Choose an integration to get started, or browse the libraries and
              guides for the platform you use.
            </p>
          </div>
          <Link
            className="integrations-page-intro-link"
            href="https://docs.notificator-project.com/"
            target="_blank"
            rel="noreferrer"
          >
            Browse documentation <ExternalLink />
          </Link>
        </CardContent>
      </Card>

      <section className="integrations-page-grid" aria-label="Available integrations">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const internal = integration.href.startsWith('/');
          const isWebflow = integration.name === 'Webflow';
          return (
            <Card
              key={integration.name}
              className={`integration-page-card integration-page-card-${integration.accent}`}
            >
              <CardHeader>
                <div className="integration-page-card-heading">
                  <span className="integration-page-icon">
                    <Icon />
                  </span>
                  <div>
                    <p>{integration.category}</p>
                    <CardTitle>{integration.name}</CardTitle>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`integration-page-status${isWebflow && webflowConnected ? ' integration-page-status-connected' : ''}`}
                >
                  <i /> {isWebflow && webflowConnected ? 'Connected' : integration.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="integration-page-description">
                  {integration.description}
                </p>
                <div className="integration-page-actions">
                  <Link
                    href={integration.href}
                    {...(!internal
                      ? { target: '_blank', rel: 'noreferrer' }
                      : {})}
                    className="integration-page-primary-action"
                  >
                    {isWebflow && webflowConnected ? 'Configure Webflow' : integration.action} <ArrowUpRight />
                  </Link>
                  <Link
                    href={integration.resourceHref}
                    target="_blank"
                    rel="noreferrer"
                    className="integration-page-secondary-action"
                  >
                    {integration.resourceLabel} <ExternalLink />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </DashboardShell>
  );
}
