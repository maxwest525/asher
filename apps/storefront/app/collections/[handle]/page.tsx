import { storefront } from '@pod/tools/shopify';

type StorefrontProduct = Awaited<ReturnType<typeof storefront.getCollectionProducts>>[number];

interface Props {
  params: Promise<{ handle: string }>;
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  overflow: 'hidden',
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
};

function ProductCard({ product }: { product: StorefrontProduct }) {
  const { amount, currencyCode } = product.priceRange.minVariantPrice;
  const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(
    parseFloat(amount),
  );
  return (
    <a href={`/products/${product.handle}`} style={cardStyle} aria-label={product.title}>
      <div style={{ height: 200, background: '#f5f5f5', overflow: 'hidden' }}>
        {product.featuredImage ? (
          <img
            src={product.featuredImage.url}
            alt={product.featuredImage.altText ?? product.title}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%' }} aria-hidden="true" />
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{product.title}</p>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#555' }}>{price}</p>
      </div>
    </a>
  );
}

export default async function CollectionPage({ params }: Props) {
  const { handle } = await params;

  let products: StorefrontProduct[] = [];
  let errorMessage: string | null = null;

  try {
    products = await storefront.getCollectionProducts(handle);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes('SHOPIFY_STORE_DOMAIN') ||
      message.includes('SHOPIFY_STOREFRONT_TOKEN') ||
      message.includes('fetch failed') ||
      message.includes('Invalid URL')
    ) {
      errorMessage = 'Configure SHOPIFY_STORE_DOMAIN to load products.';
    } else {
      errorMessage = 'Could not load this collection right now.';
    }
  }

  const displayHandle = handle
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <main style={{ padding: '2.5rem 3rem', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: '1.5rem' }}>{displayHandle}</h1>

      {errorMessage ? (
        <p style={{ color: '#888', fontSize: 15 }}>{errorMessage}</p>
      ) : products.length === 0 ? (
        <p style={{ color: '#888', fontSize: 15 }}>No products found in this collection.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20,
          }}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
