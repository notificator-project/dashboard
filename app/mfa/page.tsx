import { AuthShell } from '@/components/auth/auth-shell';
import { MfaForm } from '@/components/auth/mfa-form';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { requirePrimaryUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith('/') && !candidate.startsWith('//')
    ? candidate
    : '/';
}

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const supabaseConfig = getSupabasePublicConfig();
  await requirePrimaryUser(
    `/mfa?next=${encodeURIComponent(safeNext(params.next))}`,
  );
  return (
    <AuthShell
      eyebrow="Two-step verification"
      title="Confirm it is you"
      description="Enter the current code from the authenticator connected to your Notificator account."
    >
      <MfaForm
        supabaseConfig={supabaseConfig}
        nextPath={safeNext(params.next)}
      />
    </AuthShell>
  );
}
