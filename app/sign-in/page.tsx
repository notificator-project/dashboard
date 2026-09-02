import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/auth/sign-in-form';
import { getSupabasePublicConfig } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith('/') && !candidate.startsWith('//')
    ? candidate
    : '/';
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const supabaseConfig = getSupabasePublicConfig();
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your dashboard"
      description="Use the same Notificator account you already use in the mobile app."
    >
      <SignInForm
        supabaseConfig={supabaseConfig}
        nextPath={safeNext(params.next)}
      />
    </AuthShell>
  );
}
