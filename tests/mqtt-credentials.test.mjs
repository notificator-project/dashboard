import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { normalizeCredentials } from '../lib/mqtt/credentials.ts';
import {
  accountStorageConfigured,
  encryptCredentials,
  decryptCredentials,
} from '../lib/mqtt/encryption.ts';

const sample = {
  host: 'cluster.s1.eu.hivemq.cloud',
  username: 'tester',
  password: ' password kept intact ',
  topicPrefix: 'notificator-project',
};

test('normalization preserves the secret and rejects invalid broker inputs', () => {
  assert.deepEqual(
    normalizeCredentials({
      ...sample,
      host: 'wss://CLUSTER.s1.eu.hivemq.cloud:8884/mqtt',
      topicPrefix: '/notificator-project/',
    }),
    sample,
  );
  for (const host of [
    'localhost',
    '127.0.0.1',
    'hivemq.cloud.attacker.com',
    '.hivemq.cloud',
    'cluster..hivemq.cloud',
  ])
    assert.throws(() => normalizeCredentials({ ...sample, host }));
  for (const topicPrefix of ['a/#', '+', 'a b'])
    assert.throws(() => normalizeCredentials({ ...sample, topicPrefix }));
  assert.throws(() =>
    normalizeCredentials({ ...sample, password: 'secret\n' }),
  );
  assert.throws(() => normalizeCredentials(null));
});

test('encryption is randomized, authenticated, owner-bound and fails closed', () => {
  const original = process.env.MQTT_CREDENTIALS_ENCRYPTION_KEY;
  try {
    process.env.MQTT_CREDENTIALS_ENCRYPTION_KEY =
      randomBytes(32).toString('hex');
    const envelope = encryptCredentials('owner-a', sample);
    assert.notEqual(envelope, encryptCredentials('owner-a', sample));
    assert.ok(!envelope.includes(sample.password));
    assert.deepEqual(decryptCredentials('owner-a', envelope), sample);
    assert.throws(() => decryptCredentials('owner-b', envelope));
    const pieces = envelope.split('.');
    const ciphertext = Buffer.from(pieces[3], 'base64');
    ciphertext[0] ^= 1;
    pieces[3] = ciphertext.toString('base64');
    assert.throws(() => decryptCredentials('owner-a', pieces.join('.')));
    assert.throws(() =>
      decryptCredentials('owner-a', envelope.replace('v1.', 'v2.')),
    );
    process.env.MQTT_CREDENTIALS_ENCRYPTION_KEY =
      randomBytes(32).toString('hex');
    assert.throws(() => decryptCredentials('owner-a', envelope));
    process.env.MQTT_CREDENTIALS_ENCRYPTION_KEY = '';
    assert.equal(accountStorageConfigured(), false);
    assert.throws(() => encryptCredentials('owner-a', sample));
    process.env.MQTT_CREDENTIALS_ENCRYPTION_KEY = 'x'.repeat(64);
    assert.equal(accountStorageConfigured(), false);
  } finally {
    if (original === undefined)
      delete process.env.MQTT_CREDENTIALS_ENCRYPTION_KEY;
    else process.env.MQTT_CREDENTIALS_ENCRYPTION_KEY = original;
  }
});
