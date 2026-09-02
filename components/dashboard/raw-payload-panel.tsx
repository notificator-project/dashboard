'use client';

import { useState } from 'react';
import { Check, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RawPayloadPanel({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false);

  async function copyPayload() {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="raw-payload-panel" aria-labelledby="raw-payload-title">
      <div className="notification-data-heading">
        <div>
          <span>Original event</span>
          <h2 id="raw-payload-title">Raw payload</h2>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={copyPayload}>
          {copied ? <Check /> : <Clipboard />}
          {copied ? 'Copied' : 'Copy JSON'}
        </Button>
      </div>
      <pre aria-label="Raw notification JSON">
        <code>{payload}</code>
      </pre>
    </section>
  );
}
