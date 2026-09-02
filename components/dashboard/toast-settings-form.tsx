'use client';

import { useState, useSyncExternalStore } from 'react';
import { BellRing, Eye, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import {
  readToastPreferences,
  saveToastPreferences,
  subscribeToToastPreferences,
  type ToastPosition,
  type ToastPreferences,
  defaultToastPreferences,
} from '@/lib/toast-preferences';

export function ToastSettingsForm() {
  const savedPreferences = useSyncExternalStore(
    subscribeToToastPreferences,
    readToastPreferences,
    () => defaultToastPreferences,
  );
  const preferenceKey = JSON.stringify(savedPreferences);

  return (
    <ToastSettingsEditor
      key={preferenceKey}
      initialPreferences={savedPreferences}
    />
  );
}

function ToastSettingsEditor({
  initialPreferences,
}: {
  initialPreferences: ToastPreferences;
}) {
  const [preferences, setPreferences] =
    useState<ToastPreferences>(initialPreferences);

  function update<K extends keyof ToastPreferences>(
    key: K,
    value: ToastPreferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function save() {
    saveToastPreferences(preferences);
    toast.add({
      title: 'Toast preferences saved',
      description: 'Future dashboard notifications will use these settings.',
      type: 'success',
    });
  }

  function preview() {
    saveToastPreferences(preferences);
    toast.add({
      title: 'Preview notification',
      description: 'This is how a new Notificator alert will appear.',
      type: 'info',
    });
  }

  return (
    <div className="toast-settings-form">
      <div className="toast-settings-intro">
        <BellRing aria-hidden="true" />
        <p>
          Control how new-alert messages appear while this dashboard is open.
          These preferences are saved only in this browser.
        </p>
      </div>

      <div className="toast-settings-grid">
        <label htmlFor="toast-position">
          Position
          <select
            id="toast-position"
            value={preferences.position}
            onChange={(event) =>
              update('position', event.target.value as ToastPosition)
            }
          >
            <option value="top-left">Top left</option>
            <option value="top-right">Top right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="bottom-right">Bottom right</option>
          </select>
        </label>

        <label htmlFor="toast-duration">
          Display time
          <select
            id="toast-duration"
            value={preferences.duration}
            disabled={!preferences.autoHide}
            onChange={(event) => update('duration', Number(event.target.value))}
          >
            <option value={3000}>3 seconds</option>
            <option value={5000}>5 seconds</option>
            <option value={7000}>7 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={15000}>15 seconds</option>
          </select>
        </label>

        <label htmlFor="toast-limit">
          Maximum visible
          <select
            id="toast-limit"
            value={preferences.limit}
            onChange={(event) => update('limit', Number(event.target.value))}
          >
            <option value={2}>2 notifications</option>
            <option value={3}>3 notifications</option>
            <option value={4}>4 notifications</option>
            <option value={5}>5 notifications</option>
          </select>
        </label>
      </div>

      <label
        className="settings-toggle"
        htmlFor="toast-auto-hide"
        aria-label="Automatically hide dashboard notifications"
      >
        <span>
          <strong>Auto-hide notifications</strong>
          <small>
            Turn this off to keep each toast visible until you dismiss it.
          </small>
        </span>
        <input
          id="toast-auto-hide"
          type="checkbox"
          checked={preferences.autoHide}
          onChange={(event) => update('autoHide', event.target.checked)}
        />
      </label>

      <div className="toast-settings-actions">
        <Button type="button" onClick={save}>
          <Save aria-hidden="true" />
          Save toast settings
        </Button>
        <Button type="button" variant="outline" onClick={preview}>
          <Eye aria-hidden="true" />
          Preview
        </Button>
      </div>
    </div>
  );
}
