'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, RefreshCw } from 'lucide-react';

type VersionState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; latest: string };

function versionIsCurrent(installed: string, latest: string) {
  return (
    installed.localeCompare(latest, undefined, {
      numeric: true,
      sensitivity: 'base',
    }) >= 0
  );
}

export function PluginVersionStatus({ installed }: { installed: string }) {
  const [state, setState] = useState<VersionState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/integrations/wordpress/plugin-version', {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as { version?: unknown };
        if (!response.ok || typeof payload.version !== 'string')
          throw new Error('Version unavailable');
        setState({ status: 'ready', latest: payload.version });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        setState({ status: 'unavailable' });
      });

    return () => controller.abort();
  }, []);

  if (state.status === 'loading')
    return (
      <span className="plugin-version-state checking">
        <LoaderCircle className="auth-spinner" /> Checking latest…
      </span>
    );
  if (state.status === 'unavailable')
    return (
      <span className="plugin-version-state unavailable">
        Version check unavailable
      </span>
    );

  const current = versionIsCurrent(installed, state.latest);
  return current ? (
    <span className="plugin-version-state current">
      <CheckCircle2 /> Up to date
    </span>
  ) : (
    <a
      className="plugin-version-state update"
      href="https://wordpress.org/plugins/notificator-project/"
      target="_blank"
      rel="noreferrer"
    >
      <RefreshCw /> Update available · {state.latest}
    </a>
  );
}
