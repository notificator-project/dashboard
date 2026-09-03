import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clearMqttSession,
  readMqttSession,
  restoreAccountMqtt,
  writeMqttSession,
  loadAccountMqtt,
  mqttAccountRequest,
} from '../lib/mqtt/browser.ts';

const sample = {
  host: 'cluster.hivemq.cloud',
  username: 'user',
  password: 'secret',
  topicPrefix: 'notificator-project',
};
class MemoryStorage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, value);
  }
  removeItem(key) {
    this.values.delete(key);
  }
}

test('account restore respects session choices, isolates owners, and handles failures', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocal = globalThis.localStorage;
  const originalSession = globalThis.sessionStorage;
  try {
    globalThis.localStorage = new MemoryStorage();
    globalThis.sessionStorage = new MemoryStorage();
    globalThis.window = new EventTarget();
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return Response.json({
        saved: true,
        available: true,
        credentials: sample,
      });
    };
    let events = 0;
    window.addEventListener('notificator:mqtt-saved', () => events++);
    await restoreAccountMqtt('a');
    assert.deepEqual(readMqttSession('a'), sample);
    assert.equal(events, 1);
    assert.equal(
      localStorage.getItem('notificator_mqtt_metadata_v1_a').includes('secret'),
      false,
    );
    assert.equal(readMqttSession('b').password, '');
    await restoreAccountMqtt('a');
    assert.equal(calls, 1, 'existing session needs no account fetch');
    clearMqttSession('a');
    await restoreAccountMqtt('a');
    assert.equal(calls, 1, 'explicit clear suppresses restoration');
    assert.equal(readMqttSession('a').password, '');
    writeMqttSession('a', { ...sample, password: 'local override' });
    await restoreAccountMqtt('a');
    assert.equal(readMqttSession('a').password, 'local override');

    await Promise.all([loadAccountMqtt('b'), loadAccountMqtt('b')]);
    assert.equal(calls, 2, 'concurrent loads are deduplicated');
    let resolveFetch;
    globalThis.fetch = () =>
      new Promise((resolve) => {
        resolveFetch = resolve;
      });
    const restoring = restoreAccountMqtt('c');
    clearMqttSession('c');
    resolveFetch(
      Response.json({ saved: true, available: true, credentials: sample }),
    );
    await restoring;
    assert.equal(
      readMqttSession('c').password,
      '',
      'in-flight load cannot undo clear',
    );

    globalThis.fetch = async () =>
      Response.json({ error: 'Storage unavailable' }, { status: 503 });
    await assert.rejects(
      mqttAccountRequest('PUT', sample),
      /Storage unavailable/,
    );
    await assert.rejects(restoreAccountMqtt('d'), /Storage unavailable/);
    assert.equal(
      readMqttSession('a').password,
      'local override',
      'server failure preserves current credentials',
    );
    globalThis.fetch = async () =>
      Response.json({ saved: false, available: true, credentials: null });
    await restoreAccountMqtt('d');
    assert.equal(readMqttSession('d').password, '');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocal;
    globalThis.sessionStorage = originalSession;
  }
});
