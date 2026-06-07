import { createServiceClient } from '@pod/db';
import { DesignCard } from './design-card';

export const dynamic = 'force-dynamic';

export default async function DesignsPage() {
  const db = createServiceClient();
  const { data: designs } = await db
    .from('designs')
    .select('id, slogan, svg_url, png_url, risk_flags, created_at, niches(niche)')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  const pending = designs ?? [];

  return (
    <main style={{ fontFamily: 'system-ui', padding: '3rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Approve Designs</h1>
        <a href="/" style={{ color: '#555', textDecoration: 'none', fontSize: 14 }}>← Back to Command Center</a>
      </div>
      <p style={{ color: '#666', marginTop: 4, marginBottom: 32 }}>
        {pending.length} design{pending.length !== 1 ? 's' : ''} pending review.
        Approve to queue for Printify, reject to discard.
      </p>
      {pending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#999', border: '2px dashed #e0e0e0', borderRadius: 8 }}>
          No designs pending review. Run &quot;Generate Shirts&quot; to create some.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {pending.map((design) => (
            <DesignCard key={design.id} design={design as any} />
          ))}
        </div>
      )}
    </main>
  );
}
