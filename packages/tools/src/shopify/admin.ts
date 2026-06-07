import { env } from '../env.js';
import { request } from '../http.js';

/**
 * Shopify Admin API client (SECRET token). SERVER-ONLY — never import from a
 * client component. Used by apps/api and packages/agents for product/order admin.
 */

const API_VERSION = '2024-10';

export interface AdminProductInput {
  title: string;
  descriptionHtml: string;
  handle: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  price: number;
  imageUrls: string[];
  collectionsToJoin?: string[];
}

function adminUrl(path: string): string {
  return `https://${env.shopify.storeDomain}/admin/api/${API_VERSION}/${path}`;
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': env.shopify.adminToken,
  };
}

/** Create a product from a built, human-approved design. Returns the Shopify product id. */
export async function createProduct(_input: AdminProductInput): Promise<{ id: string }> {
  // TODO: POST products via the Admin GraphQL productCreate mutation.
  void adminUrl;
  void headers;
  void request;
  throw new Error('not implemented: createProduct');
}

/** Read recent orders for the analytics loop. */
export async function listOrders(_sinceIso: string): Promise<unknown[]> {
  throw new Error('not implemented: listOrders');
}
