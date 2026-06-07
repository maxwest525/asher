import type { AgentDefinition } from '../runtime.js';

/** listing agent. Writes channel-ready listing copy (Shopify SEO, Etsy fields). */

export const listingAgent: AgentDefinition<{ productId: string }, unknown> = {
  id: 'listing-agent',
  description: 'Generates listing copy and metadata for Shopify and Etsy from a built product.',
  systemPrompt:
    'You write conversion-focused, SEO-aware listing copy for Shopify and Etsy. Stay within marketplace policies.',
  buildPrompt: (input) => `Generate listing copy for product ${input.productId}.`,
  parseOutput: (raw) => JSON.parse(raw),
};
