// Imported only by server routes. Never expose this key in public runtime config.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function encryptionKey() {
  const value = process.env.MQTT_CREDENTIALS_ENCRYPTION_KEY || '';
  if (!/^[a-fA-F0-9]{64}$/.test(value))
    throw new Error('Account MQTT storage is not configured.');
  return Buffer.from(value, 'hex');
}

export function accountStorageConfigured() {
  return /^[a-fA-F0-9]{64}$/.test(
    process.env.MQTT_CREDENTIALS_ENCRYPTION_KEY || '',
  );
}

/** Each write gets a fresh nonce; the owner ID prevents ciphertext being moved between accounts. */
export function encryptCredentials(
  userId: string,
  credentials: unknown,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`notificator:mqtt:v1:${userId}`));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credentials), 'utf8'),
    cipher.final(),
  ]);
  return [
    'v1',
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

export function decryptCredentials(userId: string, encrypted: string): unknown {
  const [version, nonce, tag, payload, extra] = encrypted.split('.');
  if (
    version !== 'v1' ||
    !nonce ||
    !tag ||
    !payload ||
    extra !== undefined ||
    encrypted.length > 16000
  )
    throw new Error('Invalid encrypted MQTT credentials.');
  const iv = Buffer.from(nonce, 'base64');
  const authTag = Buffer.from(tag, 'base64');
  if (iv.length !== 12 || authTag.length !== 16)
    throw new Error('Invalid encrypted MQTT credentials.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAAD(Buffer.from(`notificator:mqtt:v1:${userId}`));
  decipher.setAuthTag(authTag);
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(payload, 'base64')),
      decipher.final(),
    ]).toString('utf8'),
  );
}
