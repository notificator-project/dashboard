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
import {
  normalizeCredentials,
  type MqttCredentials as MqttValues,
} from '@/lib/mqtt/credentials';
import {
  clearMqttSession,
  emptyMqttCredentials as emptyValues,
  loadAccountMqtt,
  mqttAccountRequest,
  readMqttSession,
  writeMqttSession,
} from '@/lib/mqtt/browser';

export function MqttSettingsForm({ userId }: { userId: string }) {
  const [values, setValues] = useState<MqttValues>(emptyValues);
  const [loading, setLoading] = useState(true);
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [accountAvailable, setAccountAvailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<'save' | 'test' | 'remove' | ''>('');
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<'success' | 'error'>('success');

  useEffect(() => {
    let active = true;
    async function load() {
      setValues(readMqttSession(userId));
      try {
        const result = await loadAccountMqtt(userId);
        if (!active) return;
        setAccountSaved(result.saved);
        setAccountAvailable(result.available);
        setSaveToAccount(result.saved);
        const current = readMqttSession(userId);
        if (
          result.credentials &&
          !current.password &&
          !sessionStorage.getItem(`notificator_mqtt_cleared_v1_${userId}`)
        ) {
          writeMqttSession(userId, result.credentials);
          setValues(result.credentials);
        } else {
          setValues(current);
        }
        if (result.error) {
          setTone('error');
          setMessage(result.error);
        }
      } catch {
        if (active) {
          setTone('error');
          setMessage(
            'Account storage could not be checked. You can still save credentials for this session.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending('save');
    setMessage('');
    try {
      const credentials = normalizeCredentials(values);
      if (saveToAccount) {
        await mqttAccountRequest('PUT', credentials);
        setAccountSaved(true);
      } else if (accountSaved) {
        await mqttAccountRequest('DELETE');
        setAccountSaved(false);
      }
      writeMqttSession(userId, credentials);
      setValues(credentials);
      setTone('success');
      setMessage(
        saveToAccount
          ? 'MQTT credentials saved to your account and ready in this session.'
          : accountSaved
            ? 'Account copy removed. MQTT credentials are now saved for this session only.'
            : 'MQTT settings saved for this browser session.',
      );
    } catch (error) {
      setTone('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'MQTT settings could not be saved.',
      );
    } finally {
      setPending('');
    }
  }

  async function testConnection() {
    setPending('test');
    setMessage('');
    try {
      const response = await fetch('/api/mqtt/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(normalizeCredentials(values)),
        signal: AbortSignal.timeout(15000),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setTone('error');
        setMessage(payload.error || 'The MQTT connection test failed.');
        setPending('');
        return;
      }
      setTone('success');
      setMessage(
        'Connected to HiveMQ Cloud successfully. Save your connection to use it.',
      );
    } catch (error) {
      setTone('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'The connection test could not be completed.',
      );
    } finally {
      setPending('');
    }
  }

  async function removeAccountCopy() {
    setPending('remove');
    setMessage('');
    try {
      await mqttAccountRequest('DELETE');
      setAccountSaved(false);
      setSaveToAccount(false);
      setTone('success');
      setMessage(
        'Saved account credentials removed. This session can still use its current connection.',
      );
    } catch (error) {
      setTone('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'The account copy could not be removed.',
      );
    } finally {
      setPending('');
    }
  }

  function clearSettings() {
    clearMqttSession(userId);
    setValues(emptyValues);
    setTone('success');
    setMessage(
      accountSaved
        ? 'Connection cleared from this browser session. Your account copy is still saved.'
        : 'MQTT settings removed from this browser.',
    );
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
            Use your device’s HiveMQ connection. Keep it in this browser
            session, or choose to save an encrypted copy to your Notificator
            account.
          </p>
        </div>
      </div>
      {message ? <FormMessage tone={tone}>{message}</FormMessage> : null}
      {loading ? <output>Checking saved connection…</output> : null}
      <fieldset className="mqtt-fields" disabled={loading || Boolean(pending)}>
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
        <label
          className="settings-toggle mqtt-account-toggle"
          htmlFor="mqtt-save-account"
          aria-label="Save MQTT credentials to my account"
        >
          <span>
            <strong>Save to my account</strong>
            <small id="mqtt-storage-help">
              Restore this connection when you sign in to the dashboard on
              another browser. Your password is stored encrypted.
            </small>
          </span>
          <input
            id="mqtt-save-account"
            type="checkbox"
            checked={saveToAccount}
            disabled={!accountAvailable && !saveToAccount}
            aria-describedby="mqtt-storage-help"
            onChange={(event) => {
              setSaveToAccount(event.target.checked);
              setMessage('');
            }}
          />
        </label>
        {!accountAvailable && !loading ? (
          <p className="mqtt-storage-note">
            Account saving is currently unavailable. Session storage still
            works.
          </p>
        ) : null}
        {accountSaved ? (
          <p className="mqtt-storage-note">
            An account copy is saved. Uncheck the option and save to remove it,
            or remove it below. Existing copies on other browsers or devices are
            not erased.
          </p>
        ) : null}
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
            {pending === 'save'
              ? 'Saving…'
              : saveToAccount
                ? 'Save to account'
                : 'Save for session'}
          </Button>
          <Button type="button" variant="ghost" onClick={clearSettings}>
            <Trash2 /> Clear session
          </Button>
          {accountSaved ? (
            <Button
              type="button"
              variant="ghost"
              onClick={removeAccountCopy}
              disabled={Boolean(pending)}
            >
              {pending === 'remove' ? (
                <LoaderCircle className="auth-spinner" />
              ) : (
                <Trash2 />
              )}
              Remove account copy
            </Button>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
