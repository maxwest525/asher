import { createServiceClient } from '@pod/db';

export const dynamic = 'force-dynamic';

type WinnerRow = {
  id: string;
  winner_score: number;
  triggered_rule: string;
  detected_at: string;
  scaled: boolean;
  products: {
    id: string;
    title: string;
    price: number;
    shopify_product_id: string | null;
    etsy_listing_id: string | null;
  } | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function WinnersPage() {
  const db = createServiceClient();
  const { data } = await db
    .from('winners')
    .select('id, winner_score, triggered_rule, detected_at, scaled, products(id, title, price, shopify_product_id, etsy_listing_id)')
    .order('detected_at', { ascending: false })
    .limit(50);

  const winners: WinnerRow[] = (data ?? []) as unknown as WinnerRow[];
  const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN ?? '';

  return (
    <main style={{ fontFamily: 'system-ui', padding: '3rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Winners ({winners.length})</h1>
        <a href="/" style={{ color: '#555', textDecoration: 'none', fontSize: 14 }}>← Back to Command Center</a>
      </div>

      {winners.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#999', border: '2px dashed #e0e0e0', borderRadius: 8, marginTop: 32 }}>
          No winners detected yet. Run &quot;Check Winners&quot; from the Command Center.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {(['Product', 'Score', 'Triggered Rule', 'Detected', 'Scaled?', 'Links'] as const).map((col) => (
                  <th
                    key={col}
                    style={{
                      background: '#f5f5f5',
                      textAlign: 'left',
                      padding: '10px 14px',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#555',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {winners.map((w) => (
                <tr key={w.id}>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, maxWidth: 280 }}>
                    {w.products?.title ?? <span style={{ color: '#999' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>
                    {w.winner_score.toFixed(1)}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
                    <code style={{ fontFamily: 'monospace', fontSize: 13, background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
                      {w.triggered_rule}
                    </code>
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>
                    {formatDate(w.detected_at)}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>
                    {w.scaled ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>&#10003; Scaled</span>
                    ) : (
                      <span style={{ color: '#999' }}>Pending</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>
                    {w.products?.shopify_product_id && shopifyDomain ? (
                      <a
                        href={`https://${shopifyDomain}/products/${w.products.shopify_product_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3b82f6', textDecoration: 'none', marginRight: 12 }}
                      >
                        Shopify &#8599;
                      </a>
                    ) : (
                      <span style={{ color: '#ccc', marginRight: 12 }}>—</span>
                    )}
                    {w.products?.etsy_listing_id ? (
                      <a
                        href={`https://www.etsy.com/listing/${w.products.etsy_listing_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3b82f6', textDecoration: 'none' }}
                      >
                        Etsy &#8599;
                      </a>
                    ) : (
                      <span style={{ color: '#ccc' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
