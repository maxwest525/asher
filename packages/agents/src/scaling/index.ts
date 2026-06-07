import type { AgentDefinition } from '../runtime.js';
import type { Design } from '@pod/db';

/**
 * scaling agent. Turns a winner into variants and feeds them back into the
 * approval queue (slogan variants, layout variants, hoodie/sweatshirt/seasonal,
 * Pinterest batch, collection page). Output is 'pending' — humans still approve.
 */

export const scalingAgent: AgentDefinition<{ winnerProductId: string }, Design[]> = {
  id: 'scaling-agent',
  description: 'Generates variants from a winning product and queues them for human approval.',
  systemPrompt:
    'You scale winners by generating slogan/layout/product variants. Everything you produce enters the approval queue in "pending" status — never auto-publish.',
  buildPrompt: (input) => `Generate variants for winning product ${input.winnerProductId}.`,
  parseOutput: (raw) => JSON.parse(raw) as Design[],
};
