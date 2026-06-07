import { env } from '../env.js';
import { request } from '../http.js';

/**
 * Shopify Storefront API client (PUBLIC token). Safe to call from the
 * storefront for products, collections, cart, and checkout URLs.
 *
 * Headless model: this renders the catalog; checkout hands off to Shopify.
 */

const API_VERSION = '2024-10';

export interface StorefrontProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  featuredImage: { url: string; altText: string | null } | null;
}

async function query<T>(gql: string, variables: Record<string, unknown> = {}): Promise<T> {
  const url = `https://${env.shopify.storeDomain}/api/${API_VERSION}/graphql.json`;
  const data = await request<{ data: T; errors?: unknown[] }>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': env.shopify.storefrontToken,
    },
    body: JSON.stringify({ query: gql, variables }),
  });
  if (data.errors?.length) throw new Error(`Storefront API errors: ${JSON.stringify(data.errors)}`);
  return data.data;
}

/** Fetch a single product by handle for a product page. */
export async function getProductByHandle(_handle: string): Promise<StorefrontProduct | null> {
  // TODO: implement the productByHandle GraphQL query.
  void query;
  throw new Error('not implemented: getProductByHandle');
}

/** Fetch products in a collection for a collection page. */
export async function getCollectionProducts(_handle: string): Promise<StorefrontProduct[]> {
  // TODO: implement the collectionByHandle GraphQL query.
  throw new Error('not implemented: getCollectionProducts');
}
