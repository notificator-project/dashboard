export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim();
  const anonKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !anonKey) return null;
  if (anonKey.startsWith('sb_secret_')) return null;
  return { url, anonKey };
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error(
      'Supabase is not configured. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. Never use a secret or service-role key.',
    );
  }

  return config;
}

/** The Turnstile site key is public and may safely be rendered in the browser. */
export function getTurnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY?.trim() || null;
}
