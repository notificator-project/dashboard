import md5 from 'blueimp-md5';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function gravatarUrl(email: string | null | undefined, size = 96) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!emailPattern.test(normalized)) return null;
  const safeSize = Math.min(512, Math.max(24, Math.round(size)));
  return `https://www.gravatar.com/avatar/${md5(normalized)}?s=${safeSize}&d=identicon&r=pg`;
}
