import { AuthShell } from '@/components/auth/auth-shell';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { getSupabasePublicConfig } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith('/') && !candidate.startsWith('//')
    ? candidate
    : '/';
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  return (
    <AuthShell
      eyebrow="Create your account"
      title="Start using Notificator"
      description="One account connects the dashboard, mobile app, integrations, and supported devices."
      backHref={nextPath === '/' ? '/sign-in' : `/sign-in?next=${encodeURIComponent(nextPath)}`}
    >
      <SignUpForm
        supabaseConfig={getSupabasePublicConfig()}
        nextPath={nextPath}
      />
    </AuthShell>
  );
}
