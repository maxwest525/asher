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

export interface AdminOrder {
  id: string;
  name: string;
  createdAt: string;
  totalPriceSet: {
    shopMoney: { amount: string; currencyCode: string };
  };
  lineItems: Array<{
    title: string;
    quantity: number;
    variant: { product: { handle: string } } | null;
  }>;
}

interface UserError {
  field: string[] | null;
  message: string;
}

function adminGraphqlUrl(): string {
  return `https://${env.shopify.storeDomain}/admin/api/${API_VERSION}/graphql.json`;
}

function adminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': env.shopify.adminToken,
  };
}

async function adminQuery<T>(gql: string, variables: Record<string, unknown> = {}): Promise<T> {
  const url = adminGraphqlUrl();
  const data = await request<{ data: T; errors?: unknown[] }>(url, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ query: gql, variables }),
  });
  if (data.errors?.length) throw new Error(`Admin API errors: ${JSON.stringify(data.errors)}`);
  return data.data;
}

/** Create a product from a built, human-approved design. Returns the Shopify product id. */
export async function createProduct(input: AdminProductInput): Promise<{ id: string }> {
  const mutation = `
    mutation ProductCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const productInput: Record<string, unknown> = {
    title: input.title,
    descriptionHtml: input.descriptionHtml,
    handle: input.handle,
    seo: {
      title: input.seoTitle,
      description: input.seoDescription,
    },
    tags: input.tags,
    status: 'ACTIVE',
    variants: [{ price: String(input.price) }],
  };

  if (input.collectionsToJoin && input.collectionsToJoin.length > 0) {
    productInput.collectionsToJoin = input.collectionsToJoin;
  }

  const data = await adminQuery<{
    productCreate: {
      product: { id: string } | null;
      userErrors: UserError[];
    };
  }>(mutation, { input: productInput });

  const { product, userErrors } = data.productCreate;

  if (userErrors.length > 0) {
    throw new Error(
      `Shopify productCreate userErrors: ${userErrors.map((e) => e.message).join('; ')}`,
    );
  }

  if (!product) {
    throw new Error('Shopify productCreate returned no product and no userErrors');
  }

  // Attach images via productCreateMedia if imageUrls were provided
  if (input.imageUrls.length > 0) {
    const mediaMutation = `
      mutation ProductCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media {
            ... on MediaImage {
              id
            }
          }
          mediaUserErrors {
            field
            message
          }
        }
      }
    `;

    const media = input.imageUrls.map((url) => ({
      originalSource: url,
      mediaContentType: 'IMAGE',
    }));

    const mediaData = await adminQuery<{
      productCreateMedia: {
        media: unknown[];
        mediaUserErrors: UserError[];
      };
    }>(mediaMutation, { productId: product.id, media });

    if (mediaData.productCreateMedia.mediaUserErrors.length > 0) {
      // Log but do not throw — product was created successfully; images are non-fatal
      console.warn(
        'Shopify productCreateMedia userErrors:',
        mediaData.productCreateMedia.mediaUserErrors.map((e) => e.message).join('; '),
      );
    }
  }

  return { id: product.id };
}

/** Read recent orders for the analytics loop. */
export async function listOrders(sinceIso: string): Promise<AdminOrder[]> {
  const gql = `
    query ListOrders($query: String!) {
      orders(first: 50, query: $query) {
        edges {
          node {
            id
            name
            createdAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            lineItems(first: 50) {
              edges {
                node {
                  title
                  quantity
                  variant {
                    product {
                      handle
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await adminQuery<{
    orders: {
      edges: {
        node: {
          id: string;
          name: string;
          createdAt: string;
          totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
          lineItems: {
            edges: {
              node: {
                title: string;
                quantity: number;
                variant: { product: { handle: string } } | null;
              };
            }[];
          };
        };
      }[];
    };
  }>(gql, { query: `created_at:>=${sinceIso}` });

  return data.orders.edges.map((e) => ({
    id: e.node.id,
    name: e.node.name,
    createdAt: e.node.createdAt,
    totalPriceSet: e.node.totalPriceSet,
    lineItems: e.node.lineItems.edges.map((le) => ({
      title: le.node.title,
      quantity: le.node.quantity,
      variant: le.node.variant,
    })),
  }));
}
