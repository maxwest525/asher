import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export * from './types.js';
export * from './storage.js';

/**
 * Server-only Supabase client (uses the service-role key). Never import this
 * from a client component — it bypasses row-level security.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the service client.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Public (anon) Supabase client — safe for the browser. Respects row-level
 * security. Use for storefront/dashboard reads of public data.
 */
export function createPublicClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required for the public client.');
  }
  return createClient(url, anonKey);
}
