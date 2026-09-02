export const toastPreferencesStorageKey =
  'notificator_dashboard_toast_preferences';
export const toastPreferencesChangedEvent = 'notificator:toast-preferences';

export const toastPositions = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;

export type ToastPosition = (typeof toastPositions)[number];

export type ToastPreferences = {
  position: ToastPosition;
  autoHide: boolean;
  duration: number;
  limit: number;
};

export const defaultToastPreferences: ToastPreferences = {
  position: 'bottom-right',
  autoHide: true,
  duration: 7_000,
  limit: 4,
};

let cachedValue: string | null | undefined;
let cachedPreferences = defaultToastPreferences;

export function readToastPreferences(): ToastPreferences {
  if (typeof window === 'undefined') return defaultToastPreferences;

  try {
    const storedValue = window.localStorage.getItem(toastPreferencesStorageKey);
    if (storedValue === cachedValue) return cachedPreferences;

    const saved = JSON.parse(storedValue || '{}') as Partial<ToastPreferences>;
    cachedValue = storedValue;
    cachedPreferences = {
      position: toastPositions.includes(saved.position as ToastPosition)
        ? (saved.position as ToastPosition)
        : defaultToastPreferences.position,
      autoHide:
        typeof saved.autoHide === 'boolean'
          ? saved.autoHide
          : defaultToastPreferences.autoHide,
      duration: [3_000, 5_000, 7_000, 10_000, 15_000].includes(
        saved.duration || 0,
      )
        ? (saved.duration as number)
        : defaultToastPreferences.duration,
      limit: [2, 3, 4, 5].includes(saved.limit || 0)
        ? (saved.limit as number)
        : defaultToastPreferences.limit,
    };
    return cachedPreferences;
  } catch {
    return defaultToastPreferences;
  }
}

export function saveToastPreferences(preferences: ToastPreferences) {
  window.localStorage.setItem(
    toastPreferencesStorageKey,
    JSON.stringify(preferences),
  );
  window.dispatchEvent(new Event(toastPreferencesChangedEvent));
}

export function subscribeToToastPreferences(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === toastPreferencesStorageKey) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(toastPreferencesChangedEvent, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(toastPreferencesChangedEvent, callback);
  };
}
