import { inngest } from './client';

/**
 * Inngest functions wrap the production agents from @pod/agents with durable
 * execution (retries, steps, scheduling). The handlers below are skeletons —
 * each `step.run` is where `runAgent(...)` gets called once the SDK loop is wired.
 */

// Daily research cron — the top of the business loop.
export const researchDaily = inngest.createFunction(
  { id: 'research-daily' },
  { cron: '0 9 * * *' },
  async ({ step }) => {
    await step.run('run-niche-research', async () => {
      // TODO: runAgent(nicheResearchAgent, { seedTopics }, ctx)
      return { ok: true };
    });
  },
);

// Manual "Run Research" trigger from the dashboard.
export const researchOnDemand = inngest.createFunction(
  { id: 'research-on-demand' },
  { event: 'pod/research.run' },
  async ({ step }) => {
    await step.run('run-niche-research', async () => ({ ok: true }));
  },
);

export const designsGenerate = inngest.createFunction(
  { id: 'designs-generate' },
  { event: 'pod/designs.generate' },
  async ({ step }) => {
    await step.run('generate-designs', async () => ({ ok: true }));
  },
);

export const productsPublish = inngest.createFunction(
  { id: 'products-publish' },
  { event: 'pod/products.publish' },
  async ({ step }) => {
    // HARD RULE: the publishing agent must verify approval before any publish.
    await step.run('publish-approved-only', async () => ({ ok: true }));
  },
);

export const analyticsWinners = inngest.createFunction(
  { id: 'analytics-winners' },
  { event: 'pod/analytics.winners' },
  async ({ step }) => {
    await step.run('detect-winners', async () => ({ ok: true }));
  },
);

export const winnersScale = inngest.createFunction(
  { id: 'winners-scale' },
  { event: 'pod/winners.scale' },
  async ({ step }) => {
    await step.run('scale-winners', async () => ({ ok: true }));
  },
);

export const functions = [
  researchDaily,
  researchOnDemand,
  designsGenerate,
  productsPublish,
  analyticsWinners,
  winnersScale,
];
