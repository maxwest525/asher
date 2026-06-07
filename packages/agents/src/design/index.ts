import type { AgentDefinition } from '../runtime.js';
import type { Design } from '@pod/db';

/** slogan + design agent. Produces typography-first designs in 'pending' approval state. */

export const designAgent: AgentDefinition<{ nicheId: string; count: number }, Design[]> = {
  id: 'design-agent',
  description: 'Generates slogans and typography/vector designs for a niche, gated by human approval.',
  systemPrompt:
    'You generate shirt slogans and typography designs. Reject weak slogans. Surface trademark risk as flags but NEVER auto-approve — every design is created in "pending" status for human review.',
  buildPrompt: (input) => `Generate ${input.count} candidate designs for niche ${input.nicheId}.`,
  parseOutput: (raw) => JSON.parse(raw) as Design[],
};
