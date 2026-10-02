import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyWebflowSignature(
  body: string,
  timestamp: string | null,
  signature: string | null,
  secret: string,
) {
  const numericTimestamp = Number(timestamp);
  if (!signature || !Number.isFinite(numericTimestamp)) return false;
  if (Math.abs(Date.now() - numericTimestamp) > 5 * 60 * 1000) return false;
  try {
    const expected = createHmac('sha256', secret)
      .update(`${numericTimestamp}:${body}`)
      .digest('hex');
    const actual = Buffer.from(signature, 'hex');
    const wanted = Buffer.from(expected, 'hex');
    return actual.length === wanted.length && timingSafeEqual(actual, wanted);
  } catch {
    return false;
  }
}
