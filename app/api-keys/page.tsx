import Link from 'next/link';
import { Plus } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ApiKeyManager } from '@/components/dashboard/api-key-manager';
import { buttonVariants } from '@/components/ui/button';
import { requireUser } from '@/lib/auth/session';
import { loadDashboardShellOverview } from '@/lib/dashboard/overview';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ApiKeysPage() {
  const user = await requireUser('/api-keys');
  const supabase = await createClient();
  const [overview, { data }] = await Promise.all([
    loadDashboardShellOverview(user),
    supabase
      .from('api_keys')
      .select(
        'id, name, key_type, allowed_domains, created_at, last_used_at, revoked_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);
  const keys = Array.isArray(data) ? data : [];
  return (
    <DashboardShell
      activePath="/api-keys"
      overview={overview}
      eyebrow="INTEGRATION ACCESS"
      title="API keys"
      description="Review the credentials that can deliver events to your account."
      action={
        <Link href="#create-key" className={buttonVariants()}>
          <Plus /> Create API key
        </Link>
      }
    >
      <ApiKeyManager
        keys={keys.map((key) => ({
          id: String(key.id),
          name: key.name || 'API key',
          keyType: key.key_type || 'wordpress_server',
          domains: Array.isArray(key.allowed_domains)
            ? key.allowed_domains.filter(
                (domain): domain is string => typeof domain === 'string',
              )
            : [],
          createdAt: key.created_at || null,
          lastUsedAt: key.last_used_at || null,
          revokedAt: key.revoked_at || null,
        }))}
      />
    </DashboardShell>
  );
}
