export const browserNotificationPreferencesStorageKey =
  'notificator_dashboard_browser_notifications';
export const browserNotificationPreferencesChangedEvent =
  'notificator:browser-notification-preferences';

export type BrowserNotificationPreferences = {
  enabled: boolean;
};

export const defaultBrowserNotificationPreferences: BrowserNotificationPreferences =
  {
    enabled: false,
  };

let cachedValue: string | null | undefined;
let cachedPreferences = defaultBrowserNotificationPreferences;

export function readBrowserNotificationPreferences(): BrowserNotificationPreferences {
  if (typeof window === 'undefined')
    return defaultBrowserNotificationPreferences;

  try {
    const storedValue = window.localStorage.getItem(
      browserNotificationPreferencesStorageKey,
    );
    if (storedValue === cachedValue) return cachedPreferences;

    const saved = JSON.parse(
      storedValue || '{}',
    ) as Partial<BrowserNotificationPreferences>;
    cachedValue = storedValue;
    cachedPreferences = {
      enabled:
        typeof saved.enabled === 'boolean'
          ? saved.enabled
          : defaultBrowserNotificationPreferences.enabled,
    };
    return cachedPreferences;
  } catch {
    return defaultBrowserNotificationPreferences;
  }
}

export function saveBrowserNotificationPreferences(
  preferences: BrowserNotificationPreferences,
) {
  window.localStorage.setItem(
    browserNotificationPreferencesStorageKey,
    JSON.stringify(preferences),
  );
  window.dispatchEvent(new Event(browserNotificationPreferencesChangedEvent));
}

export function subscribeToBrowserNotificationPreferences(
  callback: () => void,
) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === browserNotificationPreferencesStorageKey) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(browserNotificationPreferencesChangedEvent, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(
      browserNotificationPreferencesChangedEvent,
      callback,
    );
  };
}
