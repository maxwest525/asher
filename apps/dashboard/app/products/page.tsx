import { createServiceClient } from '@pod/db';
import { ProductCard } from './product-card';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const db = createServiceClient();
  const { data: products } = await db
    .from('products')
    .select('id, title, price, blank, created_at, designs(slogan, png_url, svg_url, risk_flags)')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  const pending = products ?? [];

  return (
    <main style={{ fontFamily: 'system-ui', padding: '3rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Approve Products</h1>
        <a href="/" style={{ color: '#555', textDecoration: 'none', fontSize: 14 }}>← Back to Command Center</a>
      </div>
      <p style={{ color: '#666', marginTop: 4, marginBottom: 32 }}>
        {pending.length} product{pending.length !== 1 ? 's' : ''} pending review.
        Approve to publish to Printify/Shopify/Etsy, reject to discard.
      </p>
      {pending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#999', border: '2px dashed #e0e0e0', borderRadius: 8 }}>
          No products pending review. Approve designs first, then run &quot;Generate Shirts&quot;.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {pending.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      )}
    </main>
  );
}
