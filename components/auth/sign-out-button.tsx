'use client';

import { useState } from 'react';
import { LoaderCircle, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { SupabasePublicConfig } from '@/lib/supabase/config';

export function SignOutButton({
  supabaseConfig,
}: {
  supabaseConfig: SupabasePublicConfig;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="sidebar-sign-out"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const supabase = createClient(supabaseConfig);
        await supabase.auth.signOut();
        window.location.assign('/sign-in');
      }}
    >
      {pending ? <LoaderCircle className="auth-spinner" /> : <LogOut />}
      <span>{pending ? 'Signing out…' : 'Sign out'}</span>
    </button>
  );
}
