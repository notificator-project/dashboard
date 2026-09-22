import { AuthShell } from '@/components/auth/auth-shell';
import { UpdatePasswordForm } from '@/components/auth/update-password-form';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { requireUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function UpdatePasswordPage() {
  await requireUser('/update-password');
  return (
    <AuthShell
      eyebrow="Choose a new password"
      title="Secure your account"
      description="Use a unique password with at least eight characters."
      backHref="/sign-in"
    >
      <UpdatePasswordForm supabaseConfig={getSupabasePublicConfig()} />
    </AuthShell>
  );
}
