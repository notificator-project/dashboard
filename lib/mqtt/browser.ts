import type { MqttCredentials } from './credentials';

export const emptyMqttCredentials: MqttCredentials = {
  host: '',
  username: '',
  password: '',
  topicPrefix: 'notificator-project',
};

export type AccountMqtt = {
  credentials: MqttCredentials | null;
  saved: boolean;
  available: boolean;
  error?: string;
};

const pendingLoads = new Map<string, Promise<AccountMqtt>>();

export function readMqttSession(userId: string): MqttCredentials {
  try {
    const metadata = JSON.parse(
      localStorage.getItem(`notificator_mqtt_metadata_v1_${userId}`) || '{}',
    );
    return {
      host: String(metadata.host || ''),
      username: String(metadata.username || ''),
      password:
        sessionStorage.getItem(`notificator_mqtt_session_v1_${userId}`) || '',
      topicPrefix: String(metadata.topicPrefix || 'notificator-project'),
    };
  } catch {
    return { ...emptyMqttCredentials };
  }
}

export function writeMqttSession(userId: string, credentials: MqttCredentials) {
  const { password, ...metadata } = credentials;
  localStorage.setItem(
    `notificator_mqtt_metadata_v1_${userId}`,
    JSON.stringify(metadata),
  );
  sessionStorage.setItem(`notificator_mqtt_session_v1_${userId}`, password);
  sessionStorage.removeItem(`notificator_mqtt_cleared_v1_${userId}`);
  window.dispatchEvent(new Event('notificator:mqtt-saved'));
}

export function clearMqttSession(userId: string) {
  localStorage.removeItem(`notificator_mqtt_metadata_v1_${userId}`);
  sessionStorage.removeItem(`notificator_mqtt_session_v1_${userId}`);
  // Clearing a tab must not immediately restore its saved account copy.
  sessionStorage.setItem(`notificator_mqtt_cleared_v1_${userId}`, 'true');
  window.dispatchEvent(new Event('notificator:mqtt-saved'));
}

export async function mqttAccountRequest(
  method: 'GET' | 'PUT' | 'DELETE',
  credentials?: MqttCredentials,
): Promise<AccountMqtt> {
  const response = await fetch('/api/mqtt/credentials', {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    ...(method === 'PUT'
      ? {
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(credentials),
        }
      : {}),
    signal: AbortSignal.timeout(8000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || 'Account MQTT settings could not be loaded.',
    );
  return result as AccountMqtt;
}

/** Deduplicate the Settings and heartbeat request without caching passwords globally. */
export function loadAccountMqtt(userId: string): Promise<AccountMqtt> {
  const existing = pendingLoads.get(userId);
  if (existing) return existing;
  const request = mqttAccountRequest('GET').finally(() =>
    pendingLoads.delete(userId),
  );
  pendingLoads.set(userId, request);
  return request;
}

export async function restoreAccountMqtt(userId: string, active = () => true) {
  const current = readMqttSession(userId);
  if (
    current.password ||
    sessionStorage.getItem(`notificator_mqtt_cleared_v1_${userId}`)
  )
    return;
  const result = await loadAccountMqtt(userId);
  // A user may have saved or cleared the form while the request was in flight.
  if (
    active() &&
    result.credentials &&
    !readMqttSession(userId).password &&
    !sessionStorage.getItem(`notificator_mqtt_cleared_v1_${userId}`)
  )
    writeMqttSession(userId, result.credentials);
}
