'use client';

import { useSyncExternalStore } from 'react';
import { Toaster } from '@/components/ui/toast';
import {
  defaultToastPreferences,
  readToastPreferences,
  subscribeToToastPreferences,
} from '@/lib/toast-preferences';

export function DashboardToaster() {
  const preferences = useSyncExternalStore(
    subscribeToToastPreferences,
    readToastPreferences,
    () => defaultToastPreferences,
  );

  return (
    <Toaster
      position={preferences.position}
      timeout={preferences.autoHide ? preferences.duration : 0}
      limit={preferences.limit}
    />
  );
}
