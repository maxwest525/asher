import { inngest } from './client';
import { runAgent } from '@pod/agents';
import {
  researchAgents,
  designAgent,
  listingAgent,
  publishingAgent,
  analyticsAgent,
  scalingAgent,
} from '@pod/agents';
import { createServiceClient } from '@pod/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runId(event: { id?: string }): string {
  return event.id ?? `manual-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Research loop (daily cron + on-demand)
// ---------------------------------------------------------------------------

const SEED_TOPICS = [
  'nurse gifts',
  'teacher gifts',
  'dog mom shirts',
  'funny retirement gifts',
  'fishing shirts',
  'coffee lover shirts',
  'gym motivation shirts',
];

async function runResearch(rid: string) {
  // The agent saves each niche via its save_niche tool call as it runs;
  // we do not upsert again here to avoid creating duplicate rows.
  const niches = await runAgent(researchAgents.nicheResearchAgent, { seedTopics: SEED_TOPICS }, { runId: rid });
  return { nicheCount: niches.length };
}

export const researchDaily = inngest.createFunction(
  {
    id: 'research-daily',
    retries: 2,
  },
  { cron: '0 9 * * *' },
  async ({ event, step }) => {
    const rid = runId(event);

    await step.run('run-niche-research', () => runResearch(rid));

    const niches = await step.run('fetch-top-niches', async () => {
      const db = createServiceClient();
      const { data } = await db
        .from('niches')
        .select('id')
        .gt('opportunity_score', 0)
        .order('opportunity_score', { ascending: false })
        .limit(5);
      return data ?? [];
    });

    await Promise.all(
      niches.map((niche) =>
        step.run(`run-competitor-research-${niche.id}`, () =>
          runAgent(researchAgents.competitorAgent, { nicheId: niche.id }, { runId: rid }),
        ),
      ),
    );

    await Promise.all(
      niches.map((niche) =>
        step.run(`run-keyword-maps-${niche.id}`, () =>
          runAgent(researchAgents.keywordAgent, { nicheId: niche.id }, { runId: rid }),
        ),
      ),
    );
  },
);

export const researchOnDemand = inngest.createFunction(
  {
    id: 'research-on-demand',
    retries: 2,
  },
  { event: 'pod/research.run' },
  async ({ event, step }) => {
    const rid = runId(event);

    await step.run('run-niche-research', () => runResearch(rid));

    const niches = await step.run('fetch-top-niches', async () => {
      const db = createServiceClient();
      const { data } = await db
        .from('niches')
        .select('id')
        .gt('opportunity_score', 0)
        .order('opportunity_score', { ascending: false })
        .limit(5);
      return data ?? [];
    });

    await Promise.all(
      niches.map((niche) =>
        step.run(`run-competitor-research-${niche.id}`, () =>
          runAgent(researchAgents.competitorAgent, { nicheId: niche.id }, { runId: rid }),
        ),
      ),
    );

    await Promise.all(
      niches.map((niche) =>
        step.run(`run-keyword-maps-${niche.id}`, () =>
          runAgent(researchAgents.keywordAgent, { nicheId: niche.id }, { runId: rid }),
        ),
      ),
    );
  },
);

// ---------------------------------------------------------------------------
// Design generation — picks top niches and generates slogans/SVGs
// ---------------------------------------------------------------------------

export const designsGenerateNightly = inngest.createFunction(
  {
    id: 'designs-generate-nightly',
    retries: 2,
  },
  { cron: '0 11 * * *' },
  async ({ event, step }) => {
    const niches = await step.run('fetch-top-niches', async () => {
      const db = createServiceClient();
      const { data } = await db
        .from('niches')
        .select('id, niche')
        .order('opportunity_score', { ascending: false })
        .limit(5);
      return data ?? [];
    });

    const results = await Promise.all(
      niches.map((niche) =>
        step.run(`generate-designs-${niche.id}`, () =>
          runAgent(designAgent, { nicheId: niche.id, count: 4 }, { runId: runId(event) }),
        ),
      ),
    );

    return { designed: results.flat().length };
  },
);

export const designsGenerate = inngest.createFunction(
  {
    id: 'designs-generate',
    retries: 2,
  },
  { event: 'pod/designs.generate' },
  async ({ event, step }) => {
    // Step 1: fetch top undesigned niches from Supabase.
    const niches = await step.run('fetch-top-niches', async () => {
      const db = createServiceClient();
      const { data } = await db
        .from('niches')
        .select('id, niche')
        .order('opportunity_score', { ascending: false })
        .limit(5);
      return data ?? [];
    });

    // Step 2: for each niche, run the design agent (fan-out).
    const results = await Promise.all(
      niches.map((niche) =>
        step.run(`generate-designs-${niche.id}`, () =>
          runAgent(designAgent, { nicheId: niche.id, count: 4 }, { runId: runId(event) }),
        ),
      ),
    );

    return { designed: results.flat().length };
  },
);

// ---------------------------------------------------------------------------
// Publish batch — only publishes products with approval_status === 'approved'
// ---------------------------------------------------------------------------

export const productsPublish = inngest.createFunction(
  {
    id: 'products-publish',
    retries: 2,
    // Throttle to avoid hammering Printify/Shopify/Etsy simultaneously.
    throttle: { limit: 5, period: '1m' },
  },
  { event: 'pod/products.publish' },
  async ({ event, step }) => {
    // Step 1: fetch approved, unpublished products.
    const products = await step.run('fetch-approved-products', async () => {
      const db = createServiceClient();
      const { data } = await db
        .from('products')
        .select('id, title')
        .eq('approval_status', 'approved')
        .is('printify_product_id', null)   // not yet published
        .limit(10);
      return data ?? [];
    });

    // Step 2: generate listing copy for each approved product.
    const listings = await Promise.all(
      products.map((p) =>
        step.run(`listing-copy-${p.id}`, () =>
          runAgent(listingAgent, { productId: p.id }, { runId: runId(event) }),
        ),
      ),
    );

    // Step 3: publish each product (agent enforces approval_status check internally).
    const published = await Promise.all(
      products.map((p) =>
        step.run(`publish-${p.id}`, () =>
          runAgent(publishingAgent, { productId: p.id }, { runId: runId(event) }),
        ),
      ),
    );

    return { queued: products.length, listings: listings.length, published: published.length };
  },
);

// ---------------------------------------------------------------------------
// Analytics + winner detection — triggered on-demand or nightly
// ---------------------------------------------------------------------------

export const analyticsWinners = inngest.createFunction(
  {
    id: 'analytics-winners',
    retries: 2,
  },
  { event: 'pod/analytics.winners' },
  async ({ event, step }) => {
    const date = new Date().toISOString().slice(0, 10);
    const winners = await step.run('detect-winners', () =>
      runAgent(analyticsAgent, { date }, { runId: runId(event) }),
    );
    return { date, winnersDetected: winners.length };
  },
);

// ---------------------------------------------------------------------------
// Scale winners — fan-out variant generation for each unscaled winner
// ---------------------------------------------------------------------------

export const winnersScale = inngest.createFunction(
  {
    id: 'winners-scale',
    retries: 2,
  },
  { event: 'pod/winners.scale' },
  async ({ event, step }) => {
    const unscaled = await step.run('fetch-unscaled-winners', async () => {
      const db = createServiceClient();
      const { data } = await db
        .from('winners')
        .select('id, product_id')
        .eq('scaled', false)
        .limit(10);
      return data ?? [];
    });

    const results = await Promise.all(
      unscaled.map((w) =>
        step.run(`scale-winner-${w.id}`, async () => {
          const variants = await runAgent(
            scalingAgent,
            { winnerProductId: w.product_id },
            { runId: runId(event) },
          );
          // Mark winner as scaled.
          const db = createServiceClient();
          await db.from('winners').update({ scaled: true }).eq('id', w.id);
          return { winnerId: w.id, variantsQueued: variants.length };
        }),
      ),
    );

    return { scaled: results.length };
  },
);

// ---------------------------------------------------------------------------
// Also wire a nightly analytics cron (separate from on-demand).
// ---------------------------------------------------------------------------

export const analyticsNightly = inngest.createFunction(
  {
    id: 'analytics-nightly',
    retries: 2,
  },
  { cron: '0 3 * * *' },
  async ({ event, step }) => {
    const date = new Date().toISOString().slice(0, 10);
    const winners = await step.run('detect-winners', () =>
      runAgent(analyticsAgent, { date }, { runId: runId(event) }),
    );
    return { date, winnersDetected: winners.length };
  },
);

export const functions = [
  researchDaily,
  researchOnDemand,
  designsGenerateNightly,
  designsGenerate,
  productsPublish,
  analyticsWinners,
  analyticsNightly,
  winnersScale,
];
