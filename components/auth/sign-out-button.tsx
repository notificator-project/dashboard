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
        // Credentials restored from an account must not remain on a signed-out tab.
        for (const key of Object.keys(window.sessionStorage)) {
          if (key.startsWith('notificator_mqtt_'))
            window.sessionStorage.removeItem(key);
        }
        window.location.assign('/sign-in');
      }}
    >
      {pending ? <LoaderCircle className="auth-spinner" /> : <LogOut />}
      <span>{pending ? 'Signing out…' : 'Sign out'}</span>
    </button>
  );
}
