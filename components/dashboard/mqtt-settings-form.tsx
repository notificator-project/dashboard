'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';
import {
  Eye,
  EyeOff,
  LoaderCircle,
  Radio,
  Save,
  Trash2,
  Wifi,
} from 'lucide-react';
import { FormMessage } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type MqttValues = {
  host: string;
  username: string;
  password: string;
  topicPrefix: string;
};

const emptyValues: MqttValues = {
  host: '',
  username: '',
  password: '',
  topicPrefix: 'notificator-project',
};

export function MqttSettingsForm({ userId }: { userId: string }) {
  const metadataKey = `notificator_mqtt_metadata_v1_${userId}`;
  const passwordKey = `notificator_mqtt_session_v1_${userId}`;
  const [values, setValues] = useState<MqttValues>(emptyValues);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<'save' | 'test' | ''>('');
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const load = window.setTimeout(() => {
      try {
        const metadata = JSON.parse(
          window.localStorage.getItem(metadataKey) || '{}',
        ) as Partial<MqttValues>;
        setValues({
          host: String(metadata.host || ''),
          username: String(metadata.username || ''),
          password: window.sessionStorage.getItem(passwordKey) || '',
          topicPrefix: String(metadata.topicPrefix || 'notificator-project'),
        });
      } catch {
        setValues(emptyValues);
      }
    }, 0);
    return () => window.clearTimeout(load);
  }, [metadataKey, passwordKey]);

  function persist() {
    window.localStorage.setItem(
      metadataKey,
      JSON.stringify({
        host: values.host,
        username: values.username,
        topicPrefix: values.topicPrefix,
      }),
    );
    window.sessionStorage.setItem(passwordKey, values.password);
    window.dispatchEvent(new Event('notificator:mqtt-saved'));
  }

  function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending('save');
    persist();
    setTone('success');
    setMessage('MQTT settings saved for this browser session.');
    setPending('');
  }

  async function testConnection() {
    setPending('test');
    setMessage('');
    const response = await fetch('/api/mqtt/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setTone('error');
      setMessage(payload.error || 'The MQTT connection test failed.');
      setPending('');
      return;
    }
    persist();
    setTone('success');
    setMessage('Connected to HiveMQ Cloud successfully.');
    setPending('');
  }

  function clearSettings() {
    window.localStorage.removeItem(metadataKey);
    window.sessionStorage.removeItem(passwordKey);
    setValues(emptyValues);
    setTone('success');
    setMessage('MQTT settings removed from this browser.');
  }

  function update(field: keyof MqttValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  return (
    <form className="mqtt-settings-form" onSubmit={save}>
      <div className="mqtt-settings-intro">
        <Radio />
        <div>
          <strong>HiveMQ Cloud connection</strong>
          <p>
            Connection details stay in this browser. The password is kept only
            for the current tab session and is sent transiently when testing.
          </p>
        </div>
      </div>
      {message ? <FormMessage tone={tone}>{message}</FormMessage> : null}
      <label htmlFor="mqtt-host">
        Cluster hostname
        <Input
          id="mqtt-host"
          value={values.host}
          onChange={(event) => update('host', event.target.value)}
          placeholder="cluster-id.s1.eu.hivemq.cloud"
          autoComplete="off"
          required
        />
      </label>
      <label htmlFor="mqtt-username">
        Username
        <Input
          id="mqtt-username"
          value={values.username}
          onChange={(event) => update('username', event.target.value)}
          autoComplete="username"
          required
        />
      </label>
      <label htmlFor="mqtt-password">
        Password
        <span className="mqtt-password-field">
          <Input
            id="mqtt-password"
            type={showPassword ? 'text' : 'password'}
            value={values.password}
            onChange={(event) => update('password', event.target.value)}
            autoComplete="current-password"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={
              showPassword ? 'Hide MQTT password' : 'Show MQTT password'
            }
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </span>
      </label>
      <label htmlFor="mqtt-topic-prefix">
        Topic prefix
        <Input
          id="mqtt-topic-prefix"
          value={values.topicPrefix}
          onChange={(event) => update('topicPrefix', event.target.value)}
          placeholder="notificator-project"
          required
        />
      </label>
      <div className="mqtt-form-actions">
        <Button
          type="button"
          onClick={testConnection}
          disabled={Boolean(pending)}
        >
          {pending === 'test' ? (
            <LoaderCircle className="auth-spinner" />
          ) : (
            <Wifi />
          )}
          {pending === 'test' ? 'Testing…' : 'Test connection'}
        </Button>
        <Button type="submit" variant="outline" disabled={Boolean(pending)}>
          {pending === 'save' ? (
            <LoaderCircle className="auth-spinner" />
          ) : (
            <Save />
          )}
          Save for session
        </Button>
        <Button type="button" variant="ghost" onClick={clearSettings}>
          <Trash2 /> Clear
        </Button>
      </div>
    </form>
  );
}
