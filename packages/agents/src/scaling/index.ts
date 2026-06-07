import Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from '../runtime.js';
import type { Design } from '@pod/db';
import { createServiceClient } from '@pod/db';

/**
 * scaling agent. Turns a winner into variants and feeds them back into the
 * approval queue (slogan variants, layout variants, hoodie/sweatshirt/seasonal,
 * Pinterest batch, collection page). Output is 'pending' — humans still approve.
 */

const tools: Anthropic.Tool[] = [
  {
    name: 'get_winner_product',
    description:
      'Fetches a winning product by ID, including its joined design and niche_id.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string', description: 'UUID of the winning product.' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'save_variant_design',
    description:
      'Inserts a new variant design into the designs table with approval_status "pending". Returns the new design id.',
    input_schema: {
      type: 'object' as const,
      properties: {
        niche_id: { type: 'string', description: 'UUID of the niche this design belongs to.' },
        slogan: { type: 'string', description: 'The variant slogan text.' },
        metadata: {
          type: 'object',
          description: 'Optional metadata (fonts, colors, angle, variant_type, etc.).',
        },
        risk_flags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional risk signals to surface for human review.',
        },
      },
      required: ['niche_id', 'slogan'],
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const db = createServiceClient();

  if (name === 'get_winner_product') {
    const product_id = input.product_id as string;
    const { data, error } = await db
      .from('products')
      .select('id, title, price, blank, design_id, designs(niche_id, slogan, svg_url, png_url)')
      .eq('id', product_id)
      .single();
    if (error) throw new Error(`get_winner_product: ${error.message}`);
    return data;
  }

  if (name === 'save_variant_design') {
    const niche_id = input.niche_id as string;
    const slogan = input.slogan as string;
    const metadata = (input.metadata as Record<string, unknown>) ?? {};
    const risk_flags = (input.risk_flags as string[]) ?? [];

    const { data, error } = await db
      .from('designs')
      .insert({
        niche_id,
        slogan,
        metadata,
        risk_flags,
        approval_status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw new Error(`save_variant_design: ${error.message}`);
    return { id: (data as { id: string }).id };
  }

  throw new Error(`Unknown tool: ${name}`);
}

export const scalingAgent: AgentDefinition<{ winnerProductId: string }, Design[]> = {
  id: 'scaling-agent',
  description: 'Generates variants from a winning product and queues them for human approval.',
  systemPrompt: `You scale winners by generating slogan/layout/product variants. Everything you produce enters the approval queue in "pending" status — never auto-publish.

Workflow:
1. Call get_winner_product with the given winnerProductId to understand the winning product's niche, slogan, blank type, and price point.
2. Based on the original slogan and niche, generate 3-5 distinct slogan variants that approach the same niche from different angles (e.g. humour, aspiration, community, bold statement, minimalist). Consider blank type variants (hoodie, sweatshirt), seasonal angles, and complementary collection products.
3. For each variant, call save_variant_design to insert it into the designs table with approval_status "pending". Include a metadata object describing the variant type and angle.
4. Output a JSON array of the saved design objects. Each object must include at least: { "id": "...", "slogan": "...", "niche_id": "...", "approval_status": "pending" }`,
  buildPrompt: (input) => `Generate variants for winning product ${input.winnerProductId}.`,
  parseOutput: (raw) => JSON.parse(raw) as Design[],
  tools,
  executeTool,
};
