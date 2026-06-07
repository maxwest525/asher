interface Props {
  params: Promise<{ handle: string }>;
}

export default async function CollectionPage({ params }: Props) {
  const { handle } = await params;
  // TODO: const products = await shopify.storefront.getCollectionProducts(handle);
  return (
    <main style={{ fontFamily: 'system-ui', padding: '3rem' }}>
      <h1>Collection: {handle}</h1>
      <p>Collection grid rendered from the Shopify Storefront API (skeleton).</p>
    </main>
  );
}
