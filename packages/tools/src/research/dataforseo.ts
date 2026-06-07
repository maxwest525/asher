import { env } from '../env.js';
import { request } from '../http.js';

/** DataForSEO client — Google Trends popularity + keyword suggestions. */

const BASE = 'https://api.dataforseo.com/v3';

function authHeader(): string {
  const token = Buffer.from(`${env.dataForSeo.login}:${env.dataForSeo.password}`).toString('base64');
  return `Basic ${token}`;
}

export interface KeywordSuggestion {
  keyword: string;
  searchVolume: number | null;
}

/** Fetch keyword suggestions for a seed term. */
export async function keywordSuggestions(_seed: string): Promise<KeywordSuggestion[]> {
  void BASE;
  void authHeader;
  void request;
  // TODO: POST {BASE}/dataforseo_labs/google/keyword_suggestions/live
  throw new Error('not implemented: keywordSuggestions');
}

/** Fetch Google Trends popularity (0-100) for a term. */
export async function trendPopularity(_term: string): Promise<number> {
  // TODO: POST {BASE}/keywords_data/google_trends/explore/live
  throw new Error('not implemented: trendPopularity');
}
