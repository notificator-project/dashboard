import 'server-only';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { AuthenticatorAssuranceLevels, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import {
  verifiedCurrentAalHeader,
  verifiedEmailHeader,
  verifiedNameHeader,
  verifiedNextAalHeader,
  verifiedUserHeader,
} from '@/lib/auth/verified-header';

function safeReturnPath(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export async function getVerifiedUser() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const trustedUserId = requestHeaders.get(verifiedUserHeader);

  if (trustedUserId) {
    const email = decodeURIComponent(
      requestHeaders.get(verifiedEmailHeader) || '',
    );
    const fullName = decodeURIComponent(
      requestHeaders.get(verifiedNameHeader) || '',
    );
    const user = {
      id: trustedUserId,
      email,
      user_metadata: fullName ? { full_name: fullName } : {},
    } as User;
    return { user, supabase };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function getAuthenticatorAssurance(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const requestHeaders = await headers();
  const currentLevel = requestHeaders.get(verifiedCurrentAalHeader);
  const nextLevel = requestHeaders.get(verifiedNextAalHeader);
  if (currentLevel || nextLevel) {
    return {
      currentLevel: (currentLevel ||
        null) as AuthenticatorAssuranceLevels | null,
      nextLevel: (nextLevel || null) as AuthenticatorAssuranceLevels | null,
      currentAuthenticationMethods: [],
    };
  }
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data;
}

export async function requirePrimaryUser(returnTo = '/') {
  if (!getSupabasePublicConfig()) {
    redirect('/sign-in?configuration=missing');
  }

  const { user, supabase } = await getVerifiedUser();

  if (!user) {
    const next = encodeURIComponent(safeReturnPath(returnTo));
    redirect(`/sign-in?next=${next}`);
  }

  return { user, supabase };
}

export async function requireUser(returnTo = '/') {
  const { user, supabase } = await requirePrimaryUser(returnTo);
  const assurance = await getAuthenticatorAssurance(supabase);

  if (assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
    const next = encodeURIComponent(safeReturnPath(returnTo));
    redirect(`/mfa?next=${next}`);
  }

  return user;
}
