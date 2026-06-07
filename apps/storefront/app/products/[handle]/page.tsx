import { notFound } from 'next/navigation';
import { storefront } from '@pod/tools/shopify';

type StorefrontProduct = NonNullable<Awaited<ReturnType<typeof storefront.getProductByHandle>>>;
type StorefrontProductVariant = StorefrontProduct['variants'][number];

interface Props {
  params: Promise<{ handle: string }>;
}

function VariantButton({ variant }: { variant: StorefrontProductVariant }) {
  return (
    <button
      type="button"
      disabled={!variant.availableForSale}
      style={{
        padding: '8px 16px',
        border: '1px solid #ccc',
        borderRadius: 6,
        background: variant.availableForSale ? '#fff' : '#f0f0f0',
        color: variant.availableForSale ? '#111' : '#aaa',
        cursor: variant.availableForSale ? 'pointer' : 'not-allowed',
        fontSize: 14,
      }}
    >
      {variant.title}
    </button>
  );
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;

  let content: React.ReactNode;

  try {
    const product = await storefront.getProductByHandle(handle);

    if (!product) {
      notFound();
    }

    const { amount, currencyCode } = product.priceRange.minVariantPrice;
    const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(
      parseFloat(amount),
    );

    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const buyUrl = shopifyDomain
      ? `https://${shopifyDomain}/products/${handle}`
      : null;

    const showVariants = product.variants.length > 1;

    content = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            background: '#f5f5f5',
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
          }}
        >
          {product.featuredImage ? (
            <img
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.title}
              style={{ width: '100%', maxHeight: 500, objectFit: 'contain' }}
            />
          ) : (
            <div style={{ height: 400 }} aria-label="No image available" />
          )}
        </div>

        <div>
          <h1 style={{ fontSize: 26, marginTop: 0, marginBottom: 8 }}>{product.title}</h1>
          <p style={{ fontSize: 20, fontWeight: 600, margin: '0 0 20px', color: '#111' }}>{price}</p>

          {product.description && (
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#444', marginBottom: 24 }}>
              {product.description}
            </p>
          )}

          {showVariants && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#555' }}>Options</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {product.variants.map((v) => (
                  <VariantButton key={v.id} variant={v} />
                ))}
              </div>
            </div>
          )}

          {buyUrl ? (
            <a
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: '#111',
                color: '#fff',
                padding: '12px 28px',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Buy on Shopify
            </a>
          ) : (
            <p style={{ color: '#aaa', fontSize: 13 }}>Configure SHOPIFY_STORE_DOMAIN to enable checkout.</p>
          )}
        </div>
      </div>
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes('SHOPIFY_STORE_DOMAIN') ||
      message.includes('SHOPIFY_STOREFRONT_TOKEN') ||
      message.includes('fetch failed') ||
      message.includes('Invalid URL')
    ) {
      content = <p style={{ color: '#888' }}>Configure SHOPIFY_STORE_DOMAIN to load products.</p>;
    } else {
      throw err;
    }
  }

  return (
    <main style={{ padding: '2.5rem 3rem', maxWidth: 1100, margin: '0 auto' }}>
      {content}
    </main>
  );
}
