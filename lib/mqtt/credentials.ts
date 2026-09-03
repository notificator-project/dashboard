export type MqttCredentials = {
  host: string;
  username: string;
  password: string;
  topicPrefix: string;
};

export function normalizeCredentials(input: unknown): MqttCredentials {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Enter valid MQTT connection details.');
  const value = input as Record<string, unknown>;
  const host = (typeof value.host === 'string' ? value.host : '')
    .trim()
    .toLowerCase()
    .replace(/^wss:\/\//, '')
    .replace(/:\d+.*$/, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
  const username =
    typeof value.username === 'string' ? value.username.trim() : '';
  const password = typeof value.password === 'string' ? value.password : '';
  const topicPrefix = (
    typeof value.topicPrefix === 'string'
      ? value.topicPrefix
      : 'notificator-project'
  )
    .trim()
    .replace(/^\/+|\/+$/g, '');
  if (
    host.length > 253 ||
    !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+hivemq\.cloud$/.test(host)
  )
    throw new Error('Enter a valid HiveMQ Cloud cluster hostname.');
  const controls = (text: string) => {
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      if (code < 32 || code === 127) return true;
    }
    return false;
  };
  if (!username || username.length > 128 || controls(username))
    throw new Error('Enter a valid HiveMQ username.');
  if (!password || password.length > 512 || controls(password))
    throw new Error('Enter a valid HiveMQ password.');
  if (
    !topicPrefix ||
    topicPrefix.length > 128 ||
    !/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(topicPrefix)
  )
    throw new Error('Enter a topic prefix without wildcards or spaces.');
  return { host, username, password, topicPrefix };
}
