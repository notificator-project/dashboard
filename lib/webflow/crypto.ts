import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function encryptionKey() {
  const value = process.env.WEBFLOW_ENCRYPTION_KEY?.trim();
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error('WEBFLOW_ENCRYPTION_KEY must be 32 bytes represented as 64 hex characters.');
  }
  return Buffer.from(value, 'hex');
}

export function encryptWebflowSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${ciphertext.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}`;
}

export function decryptWebflowSecret(envelope: string) {
  const [version, ivValue, ciphertextValue, tagValue] = envelope.split('.');
  if (version !== 'v1' || !ivValue || !ciphertextValue || !tagValue) {
    throw new Error('Invalid Webflow secret envelope.');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
