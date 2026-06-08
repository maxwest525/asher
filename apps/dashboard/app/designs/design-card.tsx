'use client';
import { useTransition, useState } from 'react';
import { setApprovalStatus } from './actions';

interface Design {
  id: string;
  slogan: string;
  svg_url: string | null;
  png_url: string | null;
  risk_flags: string[];
  created_at: string;
  niches: { niche: string } | null;
}

export function DesignCard({ design }: { design: Design }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) return null;

  function act(status: 'approved' | 'rejected') {
    startTransition(async () => {
      await setApprovalStatus(design.id, status);
      setDone(true);
    });
  }

  const previewUrl = design.png_url ?? design.svg_url;
  const formattedDate = new Date(design.created_at).toLocaleDateString();

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {previewUrl ? (
        <img src={previewUrl} alt={design.slogan} style={{ width: '100%', maxHeight: 200, objectFit: 'contain', background: '#f5f5f5', borderRadius: 4 }} />
      ) : (
        <div style={{ width: '100%', height: 120, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No preview</div>
      )}
      <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{design.slogan}</p>
      {design.niches && <p style={{ margin: 0, color: '#555' }}>Niche: {design.niches.niche}</p>}
      {design.risk_flags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {design.risk_flags.map((flag) => (
            <span key={flag} style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>{flag}</span>
          ))}
        </div>
      )}
      <p style={{ margin: 0, fontSize: 13, color: '#999' }}>{formattedDate}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          disabled={isPending}
          onClick={() => act('approved')}
          aria-label={`Approve design: ${design.slogan}`}
          style={{ flex: 1, padding: '10px 0', background: isPending ? '#d1fae5' : '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, cursor: isPending ? 'not-allowed' : 'pointer' }}
        >
          ✓ Approve
        </button>
        <button
          disabled={isPending}
          onClick={() => act('rejected')}
          aria-label={`Reject design: ${design.slogan}`}
          style={{ flex: 1, padding: '10px 0', background: isPending ? '#fee2e2' : '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, cursor: isPending ? 'not-allowed' : 'pointer' }}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}
