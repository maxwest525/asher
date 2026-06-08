import Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from '../runtime.js';
import { createServiceClient } from '@pod/db';

/** listing agent. Writes channel-ready listing copy (Shopify SEO, Etsy fields). */

const tools: Anthropic.Tool[] = [
  {
    name: 'get_product',
    description:
      'Fetches a single product by ID, including its joined design (slogan, svg_url, png_url, risk_flags).',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string', description: 'UUID of the product.' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'get_keyword_map',
    description:
      'Fetches the SEO/keyword map for a niche. Returns null if no keyword map has been generated yet.',
    input_schema: {
      type: 'object' as const,
      properties: {
        niche_id: { type: 'string', description: 'UUID of the niche.' },
      },
      required: ['niche_id'],
    },
  },
  {
    name: 'save_listing_copy',
    description:
      'Persists the best Shopify title back to the products table. Returns { saved: true } on success.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string', description: 'UUID of the product to update.' },
        shopify_title: { type: 'string', description: 'SEO-optimised Shopify product title.' },
        etsy_title: { type: 'string', description: 'Etsy-specific listing title (max 140 chars).' },
        description: { type: 'string', description: 'Long-form product description.' },
        etsy_tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Up to 13 Etsy tags.',
        },
      },
      required: ['product_id', 'shopify_title', 'etsy_title', 'description', 'etsy_tags'],
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const db = createServiceClient();

  if (name === 'get_product') {
    const product_id = input.product_id as string;
    const { data, error } = await db
      .from('products')
      .select('id, title, price, blank, designs(slogan, svg_url, png_url, risk_flags)')
      .eq('id', product_id)
      .single();
    if (error) throw new Error(`get_product: ${error.message}`);
    return data;
  }

  if (name === 'get_keyword_map') {
    const niche_id = input.niche_id as string;
    const { data, error } = await db
      .from('keyword_maps')
      .select('*')
      .eq('niche_id', niche_id)
      .maybeSingle();
    if (error) throw new Error(`get_keyword_map: ${error.message}`);
    return data;
  }

  if (name === 'save_listing_copy') {
    const product_id = input.product_id as string;
    const shopify_title = input.shopify_title as string;
    const { error } = await db
      .from('products')
      .update({ title: shopify_title })
      .eq('id', product_id);
    if (error) throw new Error(`save_listing_copy: ${error.message}`);
    return { saved: true };
  }

  throw new Error(`Unknown tool: ${name}`);
}

export const listingAgent: AgentDefinition<{ productId: string }, unknown> = {
  id: 'listing-agent',
  description: 'Generates listing copy and metadata for Shopify and Etsy from a built product.',
  systemPrompt: `You write conversion-focused, SEO-aware listing copy for Shopify and Etsy. Stay within marketplace policies.

Workflow:
1. Call get_product with the given product_id to read the product details and its joined design (slogan, risk_flags, etc.).
2. If the design has a niche_id, call get_keyword_map to retrieve primary keywords, Etsy tags, and SEO title suggestions.
3. Compose the best Shopify title (SEO-optimised, under 70 characters), Etsy title (under 140 characters), a compelling product description, and up to 13 Etsy tags.
4. Call save_listing_copy to persist the Shopify title back to the database.
5. Output a single JSON object: { "shopify_title": "...", "etsy_title": "...", "description": "...", "etsy_tags": ["...", ...] }`,
  buildPrompt: (input) => `Generate listing copy for product ${input.productId}.`,
  parseOutput: (raw) => JSON.parse(raw),
  tools,
  executeTool,
};
