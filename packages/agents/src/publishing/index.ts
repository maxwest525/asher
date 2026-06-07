import type { AgentDefinition } from '../runtime.js';

/**
 * publishing agent. Builds products in Printify and publishes to Shopify/Etsy +
 * Pinterest. HARD RULE: only acts on products whose approval_status is 'approved'.
 */

export const publishingAgent: AgentDefinition<{ productId: string }, unknown> = {
  id: 'publishing-agent',
  description: 'Publishes an APPROVED product to Printify, Shopify, Etsy, and Pinterest.',
  systemPrompt:
    'You publish products. You MUST verify approval_status === "approved" before any publish action. Never publish a pending or rejected product. Operations must be idempotent.',
  buildPrompt: (input) =>
    `Publish approved product ${input.productId}. Refuse if it is not approved.`,
  parseOutput: (raw) => JSON.parse(raw),
};
