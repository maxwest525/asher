interface Props {
  params: Promise<{ handle: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  // TODO: const product = await shopify.storefront.getProductByHandle(handle);
  return (
    <main style={{ fontFamily: 'system-ui', padding: '3rem' }}>
      <h1>Product: {handle}</h1>
      <p>Product detail rendered from the Shopify Storefront API (skeleton).</p>
    </main>
  );
}
