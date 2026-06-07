import type { AgentDefinition } from '../runtime.js';
import type { Niche } from '@pod/db';

/** niche-research, competitor, and keyword agents (the runtime research trio). */

export const nicheResearchAgent: AgentDefinition<{ seedTopics: string[] }, Niche[]> = {
  id: 'niche-research-agent',
  description: 'Finds and scores demand opportunities from trends, keywords, and marketplace signals.',
  systemPrompt:
    'You research print-on-demand niche opportunities. Use the research tools to gather trend, keyword, and competition signals. Never fabricate metrics; mark unavailable values as estimated.',
  buildPrompt: (input) => `Find scored niche opportunities for: ${input.seedTopics.join(', ')}`,
  parseOutput: (raw) => JSON.parse(raw) as Niche[],
};

export const competitorAgent: AgentDefinition<{ nicheId: string }, unknown> = {
  id: 'competitor-agent',
  description: 'Captures competitor Etsy listings into the "what\'s working" database.',
  systemPrompt:
    'You analyze competitor listings on Etsy and record structured snapshots. Mark any value not exposed by the API as estimated.',
  buildPrompt: (input) => `Capture competitor listings for niche ${input.nicheId}.`,
  parseOutput: (raw) => JSON.parse(raw),
};

export const keywordAgent: AgentDefinition<{ nicheId: string }, unknown> = {
  id: 'keyword-agent',
  description: 'Builds the SEO/keyword map for an approved niche.',
  systemPrompt: 'You build keyword maps (primary, secondary, Etsy tags, Shopify SEO, Pinterest, slug).',
  buildPrompt: (input) => `Build the keyword map for niche ${input.nicheId}.`,
  parseOutput: (raw) => JSON.parse(raw),
};

export const researchAgents = { nicheResearchAgent, competitorAgent, keywordAgent };
