/** Internal request marker set only after the proxy verifies the Supabase user. */
export const verifiedUserHeader = 'x-notificator-verified-user';
export const verifiedEmailHeader = 'x-notificator-verified-email';
export const verifiedNameHeader = 'x-notificator-verified-name';
export const verifiedCurrentAalHeader = 'x-notificator-current-aal';
export const verifiedNextAalHeader = 'x-notificator-next-aal';

export const verifiedRequestHeaders = [
  verifiedUserHeader,
  verifiedEmailHeader,
  verifiedNameHeader,
  verifiedCurrentAalHeader,
  verifiedNextAalHeader,
] as const;
