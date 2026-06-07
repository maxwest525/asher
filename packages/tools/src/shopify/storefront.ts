import { env } from '../env.js';
import { request } from '../http.js';

/**
 * Shopify Storefront API client (PUBLIC token). Safe to call from the
 * storefront for products, collections, cart, and checkout URLs.
 *
 * Headless model: this renders the catalog; checkout hands off to Shopify.
 */

const API_VERSION = '2024-10';

export interface StorefrontProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
}

export interface StorefrontProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  featuredImage: { url: string; altText: string | null } | null;
  variants: StorefrontProductVariant[];
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

const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  descriptionHtml
  priceRange {
    minVariantPrice {
      amount
      currencyCode
    }
  }
  featuredImage {
    url
    altText
  }
  variants(first: 10) {
    edges {
      node {
        id
        title
        availableForSale
      }
    }
  }
`;

interface RawProductNode {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  featuredImage: { url: string; altText: string | null } | null;
  variants: { edges: { node: StorefrontProductVariant }[] };
}

function normalizeProduct(raw: RawProductNode): StorefrontProduct {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    description: raw.description,
    descriptionHtml: raw.descriptionHtml,
    priceRange: raw.priceRange,
    featuredImage: raw.featuredImage,
    variants: raw.variants.edges.map((e) => e.node),
  };
}

/** Fetch a single product by handle for a product page. */
export async function getProductByHandle(handle: string): Promise<StorefrontProduct | null> {
  const gql = `
    query GetProductByHandle($handle: String!) {
      product: productByHandle(handle: $handle) {
        ${PRODUCT_FIELDS}
      }
    }
  `;

  const data = await query<{ product: RawProductNode | null }>(gql, { handle });

  if (data.product === null) return null;
  return normalizeProduct(data.product);
}

/** Fetch products in a collection for a collection page. */
export async function getCollectionProducts(handle: string): Promise<StorefrontProduct[]> {
  const gql = `
    query GetCollectionProducts($handle: String!) {
      collection: collectionByHandle(handle: $handle) {
        products(first: 24) {
          edges {
            node {
              ${PRODUCT_FIELDS}
            }
          }
        }
      }
    }
  `;

  const data = await query<{
    collection: { products: { edges: { node: RawProductNode }[] } } | null;
  }>(gql, { handle });

  if (data.collection === null) return [];
  return data.collection.products.edges.map((e) => normalizeProduct(e.node));
}
