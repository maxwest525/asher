'use client';

import { useState } from 'react';

/** The command-center actions, mapped to Inngest event names handled by apps/api. */
const ACTIONS: { label: string; event: string }[] = [
  { label: 'Run Research', event: 'pod/research.run' },
  { label: 'Generate Shirts', event: 'pod/designs.generate' },
  { label: 'Approve Designs', event: 'pod/designs.approve' },
  { label: 'Publish Batch', event: 'pod/products.publish' },
  { label: 'Check Winners', event: 'pod/analytics.winners' },
  { label: 'Scale Winners', event: 'pod/winners.scale' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3002';

export function CommandButtons() {
  const [status, setStatus] = useState<string>('');

  async function trigger(event: string, label: string) {
    setStatus(`Triggering "${label}"…`);
    try {
      const res = await fetch(`${API_BASE}/api/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      setStatus(res.ok ? `Queued "${label}".` : `Failed "${label}" (${res.status}).`);
    } catch {
      setStatus(`Could not reach the API for "${label}".`);
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
        {ACTIONS.map((a) => (
          <button
            key={a.event}
            onClick={() => trigger(a.event, a.label)}
            style={{ padding: '12px 16px', fontSize: 16, cursor: 'pointer' }}
          >
            {a.label}
          </button>
        ))}
      </div>
      <p aria-live="polite" style={{ marginTop: 16, minHeight: 24 }}>
        {status}
      </p>
    </div>
  );
}
