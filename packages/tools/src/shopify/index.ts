// Storefront (public) and Admin (secret) are exported from separate entry points
// so the secret Admin client is never accidentally bundled into the client.
export * as storefront from './storefront.js';
export * as admin from './admin.js';

import crypto from 'node:crypto';

/** Verify a Shopify webhook HMAC. Reject the request if this returns false. */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string, secret: string): boolean {
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}
