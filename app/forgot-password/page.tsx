import { AuthShell } from '@/components/auth/auth-shell';
import { RecoveryForm } from '@/components/auth/recovery-form';
import { getSupabasePublicConfig } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="We will send a secure password-reset link to your account email."
      backHref="/sign-in"
    >
      <RecoveryForm supabaseConfig={getSupabasePublicConfig()} />
    </AuthShell>
  );
}
