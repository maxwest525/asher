import { createServiceClient } from '@pod/db';
import * as printify from '@pod/tools/printify';
import * as etsy from '@pod/tools/etsy';
import * as pinterest from '@pod/tools/pinterest';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from '../runtime.js';

/**
 * publishing agent. Builds products in Printify and publishes to Shopify/Etsy +
 * Pinterest. HARD RULE: only acts on products whose approval_status is 'approved'.
 */

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const tools: Anthropic.Tool[] = [
  {
    name: 'get_product',
    description:
      'Fetch a product and its associated design from Supabase. Returns the full product+design object, or an error if not approved.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string', description: 'The Supabase product UUID.' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'upload_print_file',
    description:
      'Validates and uploads a design image to Printify. Rejects raster files below 300 DPI.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string' },
        image_url: { type: 'string', description: 'Public URL of the print file.' },
        mime_type: {
          type: 'string',
          enum: ['image/png', 'image/svg+xml', 'image/jpeg'],
        },
        width_px: { type: 'number' },
        height_px: { type: 'number' },
        dpi: { type: 'number', description: 'Must be >= 300 for raster files.' },
      },
      required: ['product_id', 'image_url', 'mime_type', 'width_px', 'height_px', 'dpi'],
    },
  },
  {
    name: 'create_printify_product',
    description:
      'Creates a Printify product (Bella+Canvas 3001) from an uploaded image and saves the printify_product_id to Supabase.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string' },
        image_id: { type: 'string', description: 'Printify image ID returned by upload_print_file.' },
        title: { type: 'string' },
      },
      required: ['product_id', 'image_id', 'title'],
    },
  },
  {
    name: 'publish_to_shopify',
    description: 'Publishes a Printify product to the connected Shopify store via Printify.',
    input_schema: {
      type: 'object' as const,
      properties: {
        printify_product_id: { type: 'string' },
      },
      required: ['printify_product_id'],
    },
  },
  {
    name: 'create_etsy_draft',
    description:
      'Creates a draft Etsy listing with images, saves etsy_listing_id to Supabase. Tags array max 13 items.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number', description: 'Price in USD.' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Max 13 tags.',
        },
        image_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'At least one image URL.',
        },
      },
      required: ['product_id', 'title', 'description', 'price', 'tags', 'image_urls'],
    },
  },
  {
    name: 'create_pinterest_pin',
    description:
      'Creates a Pinterest pin. Failures here do NOT block the publish flow — the agent should continue.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        image_url: { type: 'string' },
        link_url: { type: 'string', description: 'Product URL to link back to.' },
      },
      required: ['title', 'description', 'image_url', 'link_url'],
    },
  },
  {
    name: 'mark_published',
    description:
      'Updates the products Supabase row with final external IDs. Only sets fields that are provided.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string' },
        printify_product_id: { type: 'string' },
        shopify_product_id: { type: 'string' },
        etsy_listing_id: { type: 'string' },
      },
      required: ['product_id'],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const db = createServiceClient();

  switch (name) {
    case 'get_product': {
      const { product_id } = input as { product_id: string };
      const { data, error } = await db
        .from('products')
        .select(
          'id, title, price, blank, approval_status, printify_product_id, shopify_product_id, etsy_listing_id, design_id, designs(slogan, svg_url, png_url, print_file_url, niche_id)',
        )
        .eq('id', product_id)
        .single();

      if (error) return { error: error.message };
      if (!data) return { error: 'Product not found.' };
      if (data.approval_status !== 'approved') {
        return { error: 'Product is not approved. Cannot publish.' };
      }
      return data;
    }

    case 'upload_print_file': {
      const { image_url, mime_type, width_px, height_px, dpi } = input as {
        product_id: string;
        image_url: string;
        mime_type: 'image/png' | 'image/svg+xml' | 'image/jpeg';
        width_px: number;
        height_px: number;
        dpi: number;
      };
      try {
        const result = await printify.uploadImage({
          url: image_url,
          mimeType: mime_type,
          widthPx: width_px,
          heightPx: height_px,
          dpi,
        });
        return { image_id: result.id };
      } catch (err) {
        return { error: String(err) };
      }
    }

    case 'create_printify_product': {
      const { product_id, image_id, title } = input as {
        product_id: string;
        image_id: string;
        title: string;
      };
      const result = await printify.createProduct({
        shopId: printify.shopIds.shopify,
        imageId: image_id,
        title,
      });
      await db
        .from('products')
        .update({ printify_product_id: result.id })
        .eq('id', product_id);
      return { printify_product_id: result.id };
    }

    case 'publish_to_shopify': {
      const { printify_product_id } = input as { printify_product_id: string };
      await printify.publishProduct(printify.shopIds.shopify, printify_product_id);
      return { published: true };
    }

    case 'create_etsy_draft': {
      const { product_id, title, description, price, tags, image_urls } = input as {
        product_id: string;
        title: string;
        description: string;
        price: number;
        tags: string[];
        image_urls: string[];
      };
      const etsyShopId = process.env.ETSY_SHOP_ID ?? '';
      const shippingProfileId = Number(process.env.ETSY_SHIPPING_PROFILE_ID ?? '0');
      const result = await etsy.createDraftListing(etsyShopId, {
        title,
        description,
        price,
        quantity: 999,
        taxonomyId: 68887791,
        shippingProfileId,
        tags,
        materials: [],
        imageUrls: image_urls,
      });
      await db
        .from('products')
        .update({ etsy_listing_id: result.listingId })
        .eq('id', product_id);
      return { etsy_listing_id: result.listingId };
    }

    case 'create_pinterest_pin': {
      const { title, description, image_url, link_url } = input as {
        title: string;
        description: string;
        image_url: string;
        link_url: string;
      };
      try {
        const result = await pinterest.createPin({
          boardId: process.env.PINTEREST_BOARD_ID ?? '',
          title,
          description,
          imageUrl: image_url,
          link: link_url,
        });
        return { pin_id: result.id };
      } catch (err) {
        return { error: String(err) };
      }
    }

    case 'mark_published': {
      const { product_id, printify_product_id, shopify_product_id, etsy_listing_id } =
        input as {
          product_id: string;
          printify_product_id?: string;
          shopify_product_id?: string;
          etsy_listing_id?: string;
        };
      const updates: Record<string, string> = {};
      if (printify_product_id !== undefined) updates.printify_product_id = printify_product_id;
      if (shopify_product_id !== undefined) updates.shopify_product_id = shopify_product_id;
      if (etsy_listing_id !== undefined) updates.etsy_listing_id = etsy_listing_id;
      if (Object.keys(updates).length > 0) {
        await db.from('products').update(updates).eq('id', product_id);
      }
      return { updated: true };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

export interface PublishingOutput {
  success: boolean;
  printify_product_id?: string;
  etsy_listing_id?: string;
  error?: string;
}

export const publishingAgent: AgentDefinition<{ productId: string }, PublishingOutput> = {
  id: 'publishing-agent',
  description: 'Publishes an APPROVED product to Printify, Shopify, Etsy, and Pinterest.',
  systemPrompt: `You publish products to Printify, Shopify, Etsy, and Pinterest.
CRITICAL RULE: You MUST call get_product first and abort immediately if approval_status is not 'approved'.
Flow: get_product → upload_print_file → create_printify_product → publish_to_shopify → create_etsy_draft → create_pinterest_pin → mark_published.
Skip steps where data is already present (idempotency: check if printify_product_id, etsy_listing_id are already set).
Never fabricate IDs. If any critical step fails, report the error in your final output.
Respond with a JSON object only: { "success": true/false, "printify_product_id": "...", "etsy_listing_id": "...", "error": "..." }. Omit fields that are not applicable.`,
  buildPrompt: (input) =>
    `Publish approved product ${input.productId}. Refuse if it is not approved.`,
  parseOutput: (raw): PublishingOutput => {
    try {
      // Strip markdown code fences if the model wrapped the JSON.
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned) as Partial<PublishingOutput>;
      return {
        success: parsed.success === true,
        ...(parsed.printify_product_id !== undefined
          ? { printify_product_id: parsed.printify_product_id }
          : {}),
        ...(parsed.etsy_listing_id !== undefined
          ? { etsy_listing_id: parsed.etsy_listing_id }
          : {}),
        ...(parsed.error !== undefined ? { error: parsed.error } : {}),
      };
    } catch {
      return { success: false, error: `Failed to parse agent output: ${raw}` };
    }
  },
  tools,
  executeTool,
};
