import type { AgentDefinition } from '../runtime.js';
import type { Winner } from '@pod/db';

/** analytics + winner agent. Runs nightly: pulls metrics, scores winners. */

export const analyticsAgent: AgentDefinition<{ date: string }, Winner[]> = {
  id: 'analytics-agent',
  description: 'Aggregates daily metrics across channels and flags winners using the canonical formula.',
  systemPrompt:
    'You aggregate metrics from Shopify, Etsy, Printify, Pinterest, and GA4. Net fulfillment cost from revenue for gross profit. Never fabricate metrics; mark estimates. Apply the winner rules exactly.',
  buildPrompt: (input) => `Aggregate metrics for ${input.date} and detect winners.`,
  parseOutput: (raw) => JSON.parse(raw) as Winner[],
};
