/**
 * Domain types for the POD Agent OS data model.
 *
 * These mirror the tables in `schema.sql`. Once you wire up Supabase codegen
 * (`supabase gen types typescript`), replace/augment these with the generated
 * `Database` type. They are hand-written here so the skeleton type-checks today.
 */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type Channel = 'shopify' | 'etsy';

/** A scored demand opportunity produced by the research pipeline. */
export interface Niche {
  id: string;
  niche: string;
  keyword: string;
  buyer_intent: number; // 0-100
  trend_score: number; // 0-100
  competition_score: number; // 0-100
  seasonality: string | null;
  product_angle: string | null;
  opportunity_score: number; // 0-100
  created_at: string;
}

/** A competitor listing snapshot (the "what's working" DB). */
export interface CompetitorListing {
  id: string;
  niche_id: string | null;
  title: string;
  price: number | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  shop_name: string | null;
  listing_age_days: number | null;
  search_position: number | null;
  review_count: number | null;
  style_pattern: string | null;
  /** True when a value (e.g. search_position) is estimated, not API-confirmed. */
  is_estimated: boolean;
  captured_at: string;
}

/** An SEO/keyword map for an approved niche. */
export interface KeywordMap {
  id: string;
  niche_id: string;
  primary_keyword: string;
  secondary_keywords: string[];
  etsy_tags: string[];
  shopify_seo_title: string;
  pinterest_keywords: string[];
  collection_name: string;
  url_slug: string;
  created_at: string;
}

/** A generated design (typography/vector first). */
export interface Design {
  id: string;
  niche_id: string | null;
  slogan: string;
  svg_url: string | null;
  png_url: string | null;
  print_file_url: string | null;
  /** fonts, colors, preset ids, dimensions, asset licenses */
  metadata: Record<string, unknown>;
  approval_status: ApprovalStatus;
  /** Risk signals surfaced by agents; humans decide. */
  risk_flags: string[];
  created_at: string;
}

/** A product built in Printify and published to channels. */
export interface Product {
  id: string;
  design_id: string;
  printify_product_id: string | null;
  shopify_product_id: string | null;
  etsy_listing_id: string | null;
  blank: string; // e.g. "bella-canvas-3001"
  title: string;
  price: number;
  approval_status: ApprovalStatus;
  created_at: string;
}

/** Daily per-product metrics for the analytics loop. */
export interface DailyMetric {
  id: string;
  product_id: string;
  date: string; // YYYY-MM-DD
  channel: Channel;
  sales: number;
  revenue: number;
  fulfillment_cost: number;
  sessions: number;
  conversions: number;
  clicks: number;
  /** True when any field is estimated (e.g. Etsy traffic not exposed by API). */
  is_estimated: boolean;
}

/** A product flagged as a winner by the analytics agent. */
export interface Winner {
  id: string;
  product_id: string;
  winner_score: number;
  triggered_rule: string; // e.g. "3_sales_7d"
  detected_at: string;
  scaled: boolean;
}
