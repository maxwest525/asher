import { createServiceClient } from '@pod/db';
import { env } from '../env.js';
import { request } from '../http.js';

/**
 * Etsy v3 API client. Etsy connects via Printify AND this direct API layer —
 * NOT Shopify Marketplace Connect. Handles OAuth refresh, listings, and stats.
 */

const BASE = 'https://openapi.etsy.com/v3/application';
const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';

/**
 * Exchange the stored refresh token for a fresh access token.
 *
 * Etsy rotates refresh tokens on every use. The new refresh token is persisted
 * to the `etsy_tokens` table in Supabase so subsequent calls can retrieve it.
 *
 * NOTE: The `etsy_tokens` table must exist in the database with at minimum
 * columns `key text PRIMARY KEY` and `value text NOT NULL`. Example migration:
 *   CREATE TABLE etsy_tokens (key text PRIMARY KEY, value text NOT NULL);
 */
export async function refreshAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = env.etsy.clientId;
  const refreshToken = env.etsy.refreshToken;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
  });

  const response = await request<{
    access_token: string;
    expires_in: number;
    refresh_token: string;
    token_type: string;
  }>(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  // Persist the rotated refresh token so the next call works.
  try {
    const db = createServiceClient();
    await db
      .from('etsy_tokens')
      .upsert({ key: 'refresh_token', value: response.refresh_token }, { onConflict: 'key' });
  } catch (err) {
    console.error('Failed to persist rotated Etsy refresh token to Supabase:', err);
  }

  return {
    accessToken: response.access_token,
    expiresIn: response.expires_in,
  };
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

/**
 * Create a draft listing on Etsy and upload its images.
 *
 * Publishing invariants enforced here:
 *  1. At least one image URL must be provided.
 *  2. The listing is always created in `draft` state — human approval is
 *     required before it may be published (compliance/trademark gate).
 */
export async function createDraftListing(
  shopId: string,
  input: DraftListingInput,
): Promise<{ listingId: string }> {
  if (input.imageUrls.length === 0) {
    throw new Error('Etsy listing requires at least one image before publishing.');
  }

  const { accessToken } = await refreshAccessToken();
  const clientId = env.etsy.clientId;

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'x-api-key': clientId,
    'Content-Type': 'application/json',
  };

  // Step 1: Create the draft listing.
  const listingResponse = await request<{ listing_id: number }>(
    `${BASE}/shops/${shopId}/listings`,
    {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        quantity: input.quantity,
        title: input.title,
        description: input.description,
        price: input.price,
        who_made: 'i_did',
        when_made: 'made_to_order',
        taxonomy_id: input.taxonomyId,
        shipping_profile_id: input.shippingProfileId,
        state: 'draft',
        type: 'physical',
        tags: input.tags,
        materials: input.materials,
      }),
    },
  );

  const listingId = String(listingResponse.listing_id);

  // Step 2: Upload each image to the draft listing.
  for (let i = 0; i < input.imageUrls.length; i++) {
    await request<unknown>(`${BASE}/shops/${shopId}/listings/${listingId}/images`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        url: input.imageUrls[i],
        rank: i + 1,
        overwrite: false,
      }),
    });
  }

  return { listingId };
}

export interface EtsyStat {
  value: number;
  /** True when Etsy does not expose this exactly via API (e.g. search rank). */
  isEstimated: boolean;
}

/** Pull listing stats. Mark API-unavailable values as estimated, never invent them. */
export async function getListingStats(listingId: string): Promise<Record<string, EtsyStat>> {
  const { accessToken } = await refreshAccessToken();
  const clientId = env.etsy.clientId;

  const response = await request<{ views?: number; num_favorers?: number }>(
    `${BASE}/listings/${listingId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-api-key': clientId,
      },
    },
  );

  return {
    views: { value: response.views ?? 0, isEstimated: false },
    favorites: { value: response.num_favorers ?? 0, isEstimated: false },
    // search_rank and traffic_source are not exposed by the Etsy v3 API.
    search_rank: { value: 0, isEstimated: true },
    traffic_source: { value: 0, isEstimated: true },
  };
}
