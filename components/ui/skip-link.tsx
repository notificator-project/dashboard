'use client';

import type { MouseEvent } from 'react';

export function SkipLink() {
  function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById('main-content');
    if (!target) return;

    event.preventDefault();
    window.history.replaceState(null, '', '#main-content');
    target.focus();
    target.scrollIntoView({ block: 'start' });
  }

  return (
    <a className="skip-link" href="#main-content" onClick={skipToContent}>
      Skip to main content
    </a>
  );
}
