'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

export function DashboardNavigationFeedback() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setLoading(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    let timeout: number | undefined;

    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as Element | null;
      const link = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download'))
        return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === pathname)
        return;

      window.clearTimeout(timeout);
      setLoading(true);
      timeout = window.setTimeout(() => setLoading(false), 15_000);
    }

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  if (!loading) return null;

  return (
    <output className="navigation-loading-overlay" aria-live="polite">
      <LoaderCircle aria-hidden="true" />
      <span>Loading…</span>
    </output>
  );
}
