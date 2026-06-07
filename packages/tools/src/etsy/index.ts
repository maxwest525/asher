import { env } from '../env.js';
import { request } from '../http.js';

/**
 * Etsy v3 API client. Etsy connects via Printify AND this direct API layer —
 * NOT Shopify Marketplace Connect. Handles OAuth refresh, listings, and stats.
 */

const BASE = 'https://openapi.etsy.com/v3/application';

/** Exchange the stored refresh token for a fresh access token. */
export async function refreshAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
  void BASE;
  void request;
  void env.etsy.clientId;
  void env.etsy.refreshToken;
  // TODO: POST https://api.etsy.com/v3/public/oauth/token (grant_type=refresh_token)
  // Persist the rotated refresh token via @pod/db.
  throw new Error('not implemented: refreshAccessToken');
}

export interface DraftListingInput {
  title: string;
  description: string;
  price: number;
  quantity: number;
  taxonomyId: number;
  shippingProfileId: number;
  readinessStateId?: number;
  tags: string[];
  materials: string[];
  /** Must have at least one image before the listing can be published. */
  imageUrls: string[];
}

/** Create a draft listing. Publishing requires >= 1 image; enforce upstream. */
export async function createDraftListing(input: DraftListingInput): Promise<{ listingId: string }> {
  if (input.imageUrls.length === 0) {
    throw new Error('Etsy listing requires at least one image before publishing.');
  }
  // TODO: POST {BASE}/shops/{shop_id}/listings  then upload images.
  throw new Error('not implemented: createDraftListing');
}

export interface EtsyStat {
  value: number;
  /** True when Etsy does not expose this exactly via API (e.g. search rank). */
  isEstimated: boolean;
}

/** Pull listing stats. Mark API-unavailable values as estimated, never invent them. */
export async function getListingStats(_listingId: string): Promise<Record<string, EtsyStat>> {
  throw new Error('not implemented: getListingStats');
}
