import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireSupabasePublicConfig } from './config';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabasePublicConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // A Server Component cannot always write refreshed cookies. The
          // middleware refreshes them before protected pages are rendered.
        }
      },
    },
  });
}
