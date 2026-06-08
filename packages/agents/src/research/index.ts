import type Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from '../runtime.js';
import type { Niche } from '@pod/db';
import { createServiceClient } from '@pod/db';
import { dataForSeo, opportunityScore } from '@pod/tools/research';

/** niche-research, competitor, and keyword agents (the runtime research trio). */

// ---------------------------------------------------------------------------
// nicheResearchAgent
// ---------------------------------------------------------------------------

const nicheTools: Anthropic.Tool[] = [
  {
    name: 'keyword_suggestions',
    description:
      'Returns keyword suggestions with search volume for a seed term via DataForSEO.',
    input_schema: {
      type: 'object' as const,
      properties: {
        seed: { type: 'string', description: 'The seed keyword or topic.' },
      },
      required: ['seed'],
    },
  },
  {
    name: 'trend_popularity',
    description:
      'Returns a Google Trends popularity score (0-100) for a term via DataForSEO.',
    input_schema: {
      type: 'object' as const,
      properties: {
        term: { type: 'string', description: 'The term to look up trend popularity for.' },
      },
      required: ['term'],
    },
  },
  {
    name: 'opportunity_score',
    description:
      'Computes a 0-100 opportunity score from buyer intent, trend, competition, and optional seasonality.',
    input_schema: {
      type: 'object' as const,
      properties: {
        buyerIntent: {
          type: 'number',
          description: 'Buyer intent score 0-100.',
        },
        trendScore: {
          type: 'number',
          description: 'Trend score 0-100 (use trend_popularity result).',
        },
        competitionScore: {
          type: 'number',
          description: 'Competition score 0-100 (higher = more competition = worse).',
        },
        seasonalityBoost: {
          type: 'number',
          description: 'Optional seasonality adjustment -10 to 10.',
        },
      },
      required: ['buyerIntent', 'trendScore', 'competitionScore'],
    },
  },
  {
    name: 'save_niche',
    description: 'Upserts a scored niche opportunity to the niches table in the database.',
    input_schema: {
      type: 'object' as const,
      properties: {
        niche: { type: 'string', description: 'The niche name/category.' },
        keyword: { type: 'string', description: 'The primary keyword for this niche.' },
        buyer_intent: { type: 'number', description: 'Buyer intent score 0-100.' },
        trend_score: { type: 'number', description: 'Trend score 0-100.' },
        competition_score: { type: 'number', description: 'Competition score 0-100.' },
        opportunity_score: { type: 'number', description: 'Opportunity score 0-100.' },
        seasonality: {
          type: 'string',
          description: 'Seasonality description (e.g. "peaks in Q4"), or null.',
        },
        product_angle: {
          type: 'string',
          description: 'Suggested product angle or design idea, or null.',
        },
      },
      required: [
        'niche',
        'keyword',
        'buyer_intent',
        'trend_score',
        'competition_score',
        'opportunity_score',
      ],
    },
  },
];

async function nicheExecuteTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  try {
    if (name === 'keyword_suggestions') {
      const seed = input.seed as string;
      const suggestions = await dataForSeo.keywordSuggestions(seed);
      return suggestions;
    }

    if (name === 'trend_popularity') {
      const term = input.term as string;
      const score = await dataForSeo.trendPopularity(term);
      return { score };
    }

    if (name === 'opportunity_score') {
      const score = opportunityScore({
        buyerIntent: input.buyerIntent as number,
        trendScore: input.trendScore as number,
        competitionScore: input.competitionScore as number,
        seasonalityBoost:
          input.seasonalityBoost !== undefined
            ? (input.seasonalityBoost as number)
            : undefined,
      });
      return { score };
    }

    if (name === 'save_niche') {
      const db = createServiceClient();
      const record = {
        niche: input.niche as string,
        keyword: input.keyword as string,
        buyer_intent: input.buyer_intent as number,
        trend_score: input.trend_score as number,
        competition_score: input.competition_score as number,
        opportunity_score: input.opportunity_score as number,
        seasonality:
          input.seasonality !== undefined ? (input.seasonality as string | null) : null,
        product_angle:
          input.product_angle !== undefined ? (input.product_angle as string | null) : null,
      };
      const { error } = await db
        .from('niches')
        .upsert([record], { onConflict: 'niche,keyword' });
      if (error) return { error: error.message };
      return { ok: true };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    return { error: String(err) };
  }
}

export const nicheResearchAgent: AgentDefinition<{ seedTopics: string[] }, Niche[]> = {
  id: 'niche-research-agent',
  description: 'Finds and scores demand opportunities from trends, keywords, and marketplace signals.',
  systemPrompt: `You research print-on-demand niche opportunities. Follow this process for each seed topic:
1. Call keyword_suggestions to find related keywords with search volume.
2. For each promising keyword, call trend_popularity to get the trend score.
3. Estimate buyer_intent (0-100) and competition_score (0-100) from context; mark these as estimated if not confirmed by data.
4. Call opportunity_score to compute the final score.
5. Call save_niche to persist each scored niche to the database before moving on.
Never fabricate metrics; mark unavailable values as estimated.
After processing all topics, output a final JSON array of niche objects with fields: niche, keyword, buyer_intent, trend_score, competition_score, opportunity_score, seasonality, product_angle.`,
  buildPrompt: (input) => `Find scored niche opportunities for: ${input.seedTopics.join(', ')}`,
  parseOutput: (raw) => JSON.parse(raw) as Niche[],
  tools: nicheTools,
  executeTool: nicheExecuteTool,
};

// ---------------------------------------------------------------------------
// competitorAgent
// ---------------------------------------------------------------------------

const competitorTools: Anthropic.Tool[] = [
  {
    name: 'save_competitor_listing',
    description: 'Inserts a competitor listing snapshot into the competitor_listings table.',
    input_schema: {
      type: 'object' as const,
      properties: {
        niche_id: { type: 'string', description: 'The niche this listing belongs to.' },
        title: { type: 'string', description: 'Listing title.' },
        price: { type: 'number', description: 'Listing price in USD.' },
        thumbnail_url: { type: 'string', description: 'Thumbnail URL.' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Listing tags.',
        },
        shop_name: { type: 'string', description: 'Etsy shop name.' },
        listing_age_days: { type: 'number', description: 'Estimated listing age in days.' },
        search_position: { type: 'number', description: 'Position in search results.' },
        review_count: { type: 'number', description: 'Number of reviews.' },
        style_pattern: {
          type: 'string',
          description: 'Observed style pattern (e.g. "minimalist typography").',
        },
        is_estimated: {
          type: 'boolean',
          description: 'True when any field value is estimated rather than API-confirmed.',
        },
      },
      required: ['niche_id', 'title', 'is_estimated'],
    },
  },
];

async function competitorExecuteTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  try {
    if (name === 'save_competitor_listing') {
      const db = createServiceClient();
      const record = {
        niche_id: input.niche_id as string,
        title: input.title as string,
        price: input.price !== undefined ? (input.price as number) : null,
        thumbnail_url:
          input.thumbnail_url !== undefined ? (input.thumbnail_url as string) : null,
        tags: input.tags !== undefined ? (input.tags as string[]) : null,
        shop_name: input.shop_name !== undefined ? (input.shop_name as string) : null,
        listing_age_days:
          input.listing_age_days !== undefined ? (input.listing_age_days as number) : null,
        search_position:
          input.search_position !== undefined ? (input.search_position as number) : null,
        review_count:
          input.review_count !== undefined ? (input.review_count as number) : null,
        style_pattern:
          input.style_pattern !== undefined ? (input.style_pattern as string) : null,
        is_estimated: input.is_estimated as boolean,
      };
      const { error } = await db.from('competitor_listings').insert([record]);
      if (error) return { error: error.message };
      return { ok: true };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    return { error: String(err) };
  }
}

export const competitorAgent: AgentDefinition<{ nicheId: string }, unknown> = {
  id: 'competitor-agent',
  description: 'Captures competitor Etsy listings into the "what\'s working" database.',
  systemPrompt:
    'You analyze competitor listings on Etsy using your training knowledge as a research baseline. For each listing you synthesize, call save_competitor_listing to store it. Mark all values as is_estimated: true since they come from training knowledge rather than a live API. Capture at least 5 representative listings per niche covering different price points and style patterns.',
  buildPrompt: (input) => `Capture competitor listings for niche ${input.nicheId}.`,
  parseOutput: (raw) => JSON.parse(raw),
  tools: competitorTools,
  executeTool: competitorExecuteTool,
};

// ---------------------------------------------------------------------------
// keywordAgent
// ---------------------------------------------------------------------------

const keywordTools: Anthropic.Tool[] = [
  {
    name: 'keyword_suggestions',
    description:
      'Returns keyword suggestions with search volume for a seed term via DataForSEO.',
    input_schema: {
      type: 'object' as const,
      properties: {
        seed: { type: 'string', description: 'The seed keyword or topic.' },
      },
      required: ['seed'],
    },
  },
  {
    name: 'save_keyword_map',
    description: 'Upserts a complete keyword map for a niche to the keyword_maps table.',
    input_schema: {
      type: 'object' as const,
      properties: {
        niche_id: { type: 'string', description: 'The niche ID this map belongs to.' },
        primary_keyword: { type: 'string', description: 'The main SEO keyword.' },
        secondary_keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Supporting keywords.',
        },
        etsy_tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Up to 13 Etsy listing tags.',
        },
        shopify_seo_title: {
          type: 'string',
          description: 'Shopify collection/product SEO title.',
        },
        pinterest_keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Pinterest search keywords.',
        },
        collection_name: {
          type: 'string',
          description: 'Human-readable collection name for the storefront.',
        },
        url_slug: {
          type: 'string',
          description: 'URL-safe slug for the collection (e.g. "funny-cat-shirts").',
        },
      },
      required: [
        'niche_id',
        'primary_keyword',
        'secondary_keywords',
        'etsy_tags',
        'shopify_seo_title',
        'pinterest_keywords',
        'collection_name',
        'url_slug',
      ],
    },
  },
];

async function keywordExecuteTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  try {
    if (name === 'keyword_suggestions') {
      const seed = input.seed as string;
      const suggestions = await dataForSeo.keywordSuggestions(seed);
      return suggestions;
    }

    if (name === 'save_keyword_map') {
      const db = createServiceClient();
      const record = {
        niche_id: input.niche_id as string,
        primary_keyword: input.primary_keyword as string,
        secondary_keywords: input.secondary_keywords as string[],
        etsy_tags: input.etsy_tags as string[],
        shopify_seo_title: input.shopify_seo_title as string,
        pinterest_keywords: input.pinterest_keywords as string[],
        collection_name: input.collection_name as string,
        url_slug: input.url_slug as string,
      };
      const { error } = await db
        .from('keyword_maps')
        .upsert([record], { onConflict: 'niche_id' });
      if (error) return { error: error.message };
      return { ok: true };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    return { error: String(err) };
  }
}

export const keywordAgent: AgentDefinition<{ nicheId: string }, unknown> = {
  id: 'keyword-agent',
  description: 'Builds the SEO/keyword map for an approved niche.',
  systemPrompt: `You build comprehensive keyword maps for print-on-demand niches. Follow this process:
1. Call keyword_suggestions using the niche ID or topic as the seed to discover high-volume keywords.
2. Select the best primary keyword, then choose secondary keywords, Etsy tags (up to 13), Shopify SEO title, Pinterest keywords, a collection name, and a URL slug.
3. Call save_keyword_map to persist the complete map to the database.
Focus on buyer-intent keywords. Never fabricate search volumes.`,
  buildPrompt: (input) => `Build the keyword map for niche ${input.nicheId}.`,
  parseOutput: (raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      // The side-effect (save_keyword_map) is the primary output; return empty object.
      return {};
    }
  },
  tools: keywordTools,
  executeTool: keywordExecuteTool,
};

export const researchAgents = { nicheResearchAgent, competitorAgent, keywordAgent };
