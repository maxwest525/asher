import Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from '../runtime.js';
import type { Winner } from '@pod/db';
import { createServiceClient } from '@pod/db';
import { etsy, analytics } from '@pod/tools';

/** analytics + winner agent. Runs nightly: pulls metrics, scores winners. */

const tools: Anthropic.Tool[] = [
  {
    name: 'get_products',
    description:
      'Returns all approved products that have been fulfilled via Printify (i.e. printify_product_id is not null).',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_daily_metrics',
    description:
      'Returns aggregated daily metrics for a product over the last N days: total sales, revenue, fulfillment cost, and average conversion rate across all channels.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string', description: 'UUID of the product.' },
        days: { type: 'number', description: 'Number of days to look back (e.g. 7 or 14).' },
      },
      required: ['product_id', 'days'],
    },
  },
  {
    name: 'get_etsy_stats',
    description:
      'Fetches live listing stats from the Etsy v3 API. Fields that the API does not expose are marked isEstimated: true.',
    input_schema: {
      type: 'object' as const,
      properties: {
        listing_id: { type: 'string', description: 'Etsy listing ID.' },
      },
      required: ['listing_id'],
    },
  },
  {
    name: 'compute_winner_score',
    description:
      'Computes the canonical winner score and evaluates all threshold rules. Returns the numeric score and which rules (if any) were triggered.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sales_7d: { type: 'number', description: 'Sales in the last 7 days.' },
        gross_profit_7d: {
          type: 'number',
          description: 'Gross profit (revenue minus fulfillment cost) in the last 7 days.',
        },
        conversion_rate: { type: 'number', description: 'Conversion rate as a decimal (0-1).' },
        favorites: { type: 'number', description: 'Number of Etsy favorites.' },
        clicks: { type: 'number', description: 'Number of Pinterest or other clicks.' },
        trend_momentum: { type: 'number', description: 'Trend momentum score (0-100).' },
        sales_14d: { type: 'number', description: 'Sales in the last 14 days.' },
      },
      required: [
        'sales_7d',
        'gross_profit_7d',
        'conversion_rate',
        'favorites',
        'clicks',
        'trend_momentum',
        'sales_14d',
      ],
    },
  },
  {
    name: 'flag_winner',
    description:
      'Idempotently records a winner in the winners table. Skips if a non-scaled winner already exists for this product.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string', description: 'UUID of the winning product.' },
        winner_score: { type: 'number', description: 'Computed winner score.' },
        triggered_rule: {
          type: 'string',
          description:
            'The rule that fired (e.g. "3_sales_7d", "5_sales_14d", "gross_profit_75", "conversion_2_5pct").',
        },
      },
      required: ['product_id', 'winner_score', 'triggered_rule'],
    },
  },
  {
    name: 'save_daily_metrics',
    description:
      "Upserts a day's final metrics for a product/channel combination. This is a full overwrite, not an increment.",
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        channel: { type: 'string', description: '"shopify" or "etsy"' },
        sales: { type: 'number' },
        revenue: { type: 'number' },
        fulfillment_cost: { type: 'number' },
        sessions: { type: 'number' },
        conversions: { type: 'number' },
        clicks: { type: 'number' },
        is_estimated: { type: 'boolean' },
      },
      required: [
        'product_id',
        'date',
        'channel',
        'sales',
        'revenue',
        'fulfillment_cost',
        'sessions',
        'conversions',
        'clicks',
        'is_estimated',
      ],
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const db = createServiceClient();

  if (name === 'get_products') {
    const { data, error } = await db
      .from('products')
      .select('id, title, shopify_product_id, etsy_listing_id')
      .eq('approval_status', 'approved')
      .not('printify_product_id', 'is', null);
    if (error) throw new Error(`get_products: ${error.message}`);
    return data;
  }

  if (name === 'get_daily_metrics') {
    const product_id = input.product_id as string;
    const days = input.days as number;

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);

    const { data, error } = await db
      .from('daily_metrics')
      .select('sales, revenue, fulfillment_cost, sessions, conversions')
      .eq('product_id', product_id)
      .gte('date', sinceStr)
      .lte('date', todayStr);

    if (error) throw new Error(`get_daily_metrics: ${error.message}`);

    const rows = (data ?? []) as {
      sales: number;
      revenue: number;
      fulfillment_cost: number;
      sessions: number;
      conversions: number;
    }[];

    const sales_total = rows.reduce((s, r) => s + (r.sales ?? 0), 0);
    const revenue_total = rows.reduce((s, r) => s + (r.revenue ?? 0), 0);
    const fulfillment_cost_total = rows.reduce((s, r) => s + (r.fulfillment_cost ?? 0), 0);
    const total_sessions = rows.reduce((s, r) => s + (r.sessions ?? 0), 0);
    const total_conversions = rows.reduce((s, r) => s + (r.conversions ?? 0), 0);
    const avg_conversion_rate = total_sessions > 0 ? total_conversions / total_sessions : 0;

    return { sales_total, revenue_total, fulfillment_cost_total, avg_conversion_rate };
  }

  if (name === 'get_etsy_stats') {
    const listing_id = input.listing_id as string;
    try {
      const stats = await etsy.getListingStats(listing_id);
      return stats;
    } catch (err) {
      return { error: String(err) };
    }
  }

  if (name === 'compute_winner_score') {
    const metrics: analytics.ProductWindowMetrics = {
      sales7d: input.sales_7d as number,
      sales14d: input.sales_14d as number,
      grossProfit7d: input.gross_profit_7d as number,
      conversionRate: input.conversion_rate as number,
      favoritesOrClicks: (input.favorites as number) + (input.clicks as number),
      trendMomentum: input.trend_momentum as number,
    };

    const verdict = analytics.evaluateWinner(metrics);
    const rules_triggered: string[] = verdict.triggeredRule ? [verdict.triggeredRule] : [];

    return { score: verdict.score, rules_triggered };
  }

  if (name === 'flag_winner') {
    const product_id = input.product_id as string;
    const winner_score = input.winner_score as number;
    const triggered_rule = input.triggered_rule as string;

    // Idempotency check: skip if a non-scaled winner already exists.
    const { data: existing } = await db
      .from('winners')
      .select('id')
      .eq('product_id', product_id)
      .eq('scaled', false)
      .maybeSingle();

    if (existing) {
      return { skipped: true };
    }

    const { data, error } = await db
      .from('winners')
      .insert({ product_id, winner_score, triggered_rule })
      .select('id')
      .single();

    if (error) throw new Error(`flag_winner: ${error.message}`);
    return { id: (data as { id: string }).id };
  }

  if (name === 'save_daily_metrics') {
    const { error } = await db.from('daily_metrics').upsert(
      {
        product_id: input.product_id,
        date: input.date,
        channel: input.channel,
        sales: input.sales,
        revenue: input.revenue,
        fulfillment_cost: input.fulfillment_cost,
        sessions: input.sessions,
        conversions: input.conversions,
        clicks: input.clicks,
        is_estimated: input.is_estimated,
      },
      { onConflict: 'product_id,date,channel' },
    );
    if (error) throw new Error(`save_daily_metrics: ${error.message}`);
    return { saved: true };
  }

  throw new Error(`Unknown tool: ${name}`);
}

export const analyticsAgent: AgentDefinition<{ date: string }, Winner[]> = {
  id: 'analytics-agent',
  description:
    'Aggregates daily metrics across channels and flags winners using the canonical formula.',
  systemPrompt: `You aggregate metrics from Shopify, Etsy, Printify, Pinterest, and GA4. Net fulfillment cost from revenue for gross profit. Never fabricate metrics; mark estimates. Apply the winner rules exactly.

Workflow for each nightly run:
1. Call get_products to list all active approved products.
2. For each product, call get_daily_metrics twice — once with days=7 and once with days=14 — to obtain the 7-day and 14-day aggregates.
3. For any product that has an etsy_listing_id, call get_etsy_stats to retrieve live Etsy favorites and views.
4. Call compute_winner_score for each product using the 7-day metrics, Etsy stats, and any trend momentum available.
5. If the returned rules_triggered array is non-empty, call flag_winner for that product.
6. Call save_daily_metrics for each product/channel pair to persist the day's final aggregated numbers.
7. After processing all products, output a JSON array of Winner objects for every product that was flagged this run. Each object must match: { id, product_id, winner_score, triggered_rule, detected_at, scaled }.`,
  buildPrompt: (input) => `Aggregate metrics for ${input.date} and detect winners.`,
  parseOutput: (raw) => JSON.parse(raw) as Winner[],
  tools,
  executeTool,
};
