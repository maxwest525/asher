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

// ---- response shape types ------------------------------------------------

interface KeywordSuggestionsResponse {
  tasks?: Array<{
    result?: Array<{
      items?: Array<{
        keyword: string;
        keyword_data?: {
          keyword_info?: {
            search_volume?: number | null;
          };
        };
      }>;
    }>;
  }>;
}

interface TrendPopularityResponse {
  tasks?: Array<{
    result?: Array<{
      items?: Array<{
        type: string;
        data?: Array<{
          values?: number[];
        }>;
      }>;
    }>;
  }>;
}

// -------------------------------------------------------------------------

/** Fetch keyword suggestions for a seed term. */
export async function keywordSuggestions(seed: string): Promise<KeywordSuggestion[]> {
  const url = `${BASE}/dataforseo_labs/google/keyword_suggestions/live`;
  const body = JSON.stringify([
    { keyword: seed, language_name: 'English', location_code: 2840, limit: 20 },
  ]);

  const data = await request<KeywordSuggestionsResponse>(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body,
  });

  const items = data?.tasks?.[0]?.result?.[0]?.items;
  if (!items) return [];

  return items.map((item) => ({
    keyword: item.keyword,
    searchVolume: item.keyword_data?.keyword_info?.search_volume ?? null,
  }));
}

/** Fetch Google Trends popularity (0-100) for a term. */
export async function trendPopularity(term: string): Promise<number> {
  const url = `${BASE}/keywords_data/google_trends/explore/live`;
  const body = JSON.stringify([
    { keywords: [term], location_code: 2840, language_code: 'en', type: 'web' },
  ]);

  const data = await request<TrendPopularityResponse>(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body,
  });

  const items = data?.tasks?.[0]?.result?.[0]?.items;
  if (!items) return 0;

  const graphItem = items.find((item) => item.type === 'google_trends_graph');
  if (!graphItem?.data) return 0;

  const allValues: number[] = graphItem.data.flatMap((d) => d.values ?? []);
  if (allValues.length === 0) return 0;

  const avg = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;
  return Math.round(avg);
}
