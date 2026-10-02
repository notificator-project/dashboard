import Link from 'next/link';
import { ArrowLeft, Globe2, ShieldCheck } from 'lucide-react';

import { WebflowIntegrationManager } from '@/components/dashboard/webflow-integration-manager';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { buttonVariants } from '@/components/ui/button';
import { requireUser } from '@/lib/auth/session';
import { loadDashboardShellOverview } from '@/lib/dashboard/overview';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function WebflowIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ webflow?: string }>;
}) {
  const user = await requireUser('/integrations/webflow');
  const supabase = await createClient();
  const [overview, { data: integrations }, { data: apiKeys }] = await Promise.all([
    loadDashboardShellOverview(user),
    supabase
      .from('webflow_integrations')
      .select(
        'id, webflow_site_id, webflow_site_name, api_key_id, status, webflow_scenarios(id, name, form_name, severity, enabled, webhook_id, created_at)',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('api_keys')
      .select('id, name, key_type')
      .eq('user_id', user.id)
      .eq('key_type', 'public_client')
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
  ]);
  const params = await searchParams;

  return (
    <DashboardShell
      activePath="/integrations/webflow"
      overview={overview}
      eyebrow="WEBSITE AUTOMATION"
      title="Webflow"
      description="Connect Webflow to your account, then create scenarios for form submissions."
      action={
        <Link
          href="/integrations"
          className={buttonVariants({ variant: 'outline' })}
        >
          <ArrowLeft /> Back to integrations
        </Link>
      }
    >
      <section className="webflow-page-hero" aria-label="Webflow integration overview">
        <span className="webflow-page-hero-icon"><Globe2 /></span>
        <div>
          <p>ACCOUNT CONNECTION</p>
          <h2>Bring Webflow events into Notificator</h2>
          <span>Authorize Webflow once, choose a site, and route form submissions through an API key you control.</span>
        </div>
        <div className="webflow-page-hero-trust"><ShieldCheck /><span>OAuth credentials stay encrypted</span></div>
      </section>
      <WebflowIntegrationManager
        initialIntegrations={(integrations || []).map((integration) => ({
          id: String(integration.id),
          webflow_site_id: integration.webflow_site_id,
          webflow_site_name: integration.webflow_site_name,
          api_key_id: integration.api_key_id,
          status: integration.status,
          webflow_scenarios: Array.isArray(integration.webflow_scenarios)
            ? integration.webflow_scenarios.map((scenario) => ({
                id: String(scenario.id),
                name: scenario.name,
                form_name: scenario.form_name,
                severity: scenario.severity,
                enabled: scenario.enabled,
                webhook_id: scenario.webhook_id,
                created_at: scenario.created_at,
              }))
            : [],
        }))}
        apiKeys={(apiKeys || []).map((key) => ({
          id: String(key.id),
          name: key.name || 'API key',
          keyType: key.key_type || 'public_client',
        }))}
        connectedFromOAuth={params.webflow === 'connected'}
      />
    </DashboardShell>
  );
}
