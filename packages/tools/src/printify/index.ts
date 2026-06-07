import { env } from '../env.js';
import { request } from '../http.js';

/**
 * Printify API client. Product creation + fulfillment. Publishes to the
 * connected Shopify and Etsy stores. Default blank: Bella+Canvas 3001.
 */

const BASE = 'https://api.printify.com/v1';

export interface PrintFile {
  /** PNG or SVG (JPEG also accepted). Raster files should be 300 DPI. */
  url: string;
  mimeType: 'image/png' | 'image/svg+xml' | 'image/jpeg';
  widthPx: number;
  heightPx: number;
  dpi: number;
}

const MIN_DPI = 300;

/** Guard: reject under-resolution raster print files before upload. */
export function validatePrintFile(file: PrintFile): void {
  if (file.mimeType !== 'image/svg+xml' && file.dpi < MIN_DPI) {
    throw new Error(`Print file below ${MIN_DPI} DPI (got ${file.dpi}).`);
  }
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${env.printify.token}`,
    'Content-Type': 'application/json',
  };
}

/** Upload a design image to Printify's media library. */
export async function uploadImage(file: PrintFile): Promise<{ id: string }> {
  validatePrintFile(file);
  const response = await request<{ id: string; file_name: string }>(
    `${BASE}/uploads/images.json`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ file_name: 'design.png', url: file.url }),
    },
  );
  return { id: response.id };
}

/**
 * Create a product (default Bella+Canvas 3001, blueprint_id 12) from an
 * uploaded image.
 *
 * Variant IDs 17887/17889/17891/17893 are example S/M/L/XL variants for
 * Bella+Canvas 3001 via print_provider_id 29 (Monster Digital). In a future
 * iteration these should be fetched dynamically from:
 *   GET /v1/catalog/blueprints/12/print_providers/29/variants.json
 */
export async function createProduct(args: {
  shopId: string;
  imageId: string;
  title: string;
}): Promise<{ id: string }> {
  const body = {
    title: args.title,
    blueprint_id: 12,
    print_provider_id: 29,
    variants: [
      { id: 17887, price: 2500, is_enabled: true },
      { id: 17889, price: 2500, is_enabled: true },
      { id: 17891, price: 2500, is_enabled: true },
      { id: 17893, price: 2500, is_enabled: true },
    ],
    print_areas: [
      {
        variant_ids: [17887, 17889, 17891, 17893],
        placeholders: [
          {
            position: 'front',
            images: [
              {
                id: args.imageId,
                x: 0.5,
                y: 0.5,
                scale: 1,
                angle: 0,
              },
            ],
          },
        ],
      },
    ],
  };

  const response = await request<{ id: string }>(
    `${BASE}/shops/${args.shopId}/products.json`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    },
  );
  return { id: response.id };
}

/** Publish a product to a connected store (Shopify or Etsy). */
export async function publishProduct(shopId: string, productId: string): Promise<void> {
  await request<void>(`${BASE}/shops/${shopId}/products/${productId}/publish.json`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      title: true,
      description: true,
      images: true,
      variants: true,
      tags: true,
      keyFeatures: true,
      shipping_template: true,
    }),
  });
}

export const shopIds = {
  get shopify() {
    return env.printify.shopifyShopId;
  },
  get etsy() {
    return env.printify.etsyShopId;
  },
};
