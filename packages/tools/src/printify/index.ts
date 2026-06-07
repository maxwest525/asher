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
  void BASE;
  void headers;
  void request;
  // TODO: POST /uploads/images.json
  throw new Error('not implemented: uploadImage');
}

/** Create a product (default Bella+Canvas 3001) from an uploaded image. */
export async function createProduct(_args: {
  shopId: string;
  imageId: string;
  title: string;
}): Promise<{ id: string }> {
  throw new Error('not implemented: createProduct');
}

/** Publish a product to a connected store (Shopify or Etsy). */
export async function publishProduct(_shopId: string, _productId: string): Promise<void> {
  throw new Error('not implemented: publishProduct');
}

export const shopIds = {
  get shopify() {
    return env.printify.shopifyShopId;
  },
  get etsy() {
    return env.printify.etsyShopId;
  },
};
