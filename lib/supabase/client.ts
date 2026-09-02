'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabasePublicConfig } from './config';

let browserClient: SupabaseClient | undefined;

export function createClient(config: SupabasePublicConfig) {
  if (!browserClient) {
    browserClient = createBrowserClient(config.url, config.anonKey, {
      isSingleton: true,
    });
  }

  return browserClient;
}
