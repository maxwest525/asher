import Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from '../runtime.js';
import type { Design } from '@pod/db';
import { createServiceClient, uploadDesignSvg } from '@pod/db';
import { design, research } from '@pod/tools';

/** slogan + design agent. Produces typography-first designs in 'pending' approval state. */

// ---------------------------------------------------------------------------
// Preset registries — the agent passes string IDs; the executor resolves them.
// ---------------------------------------------------------------------------

const LAYOUT_PRESETS: Record<string, design.LayoutPreset> = {
  bold_centered: {
    id: 'bold_centered',
    fontFamily: 'Oswald',
    fontWeight: 700,
    textTransform: 'uppercase',
    maxLines: 2,
  },
  clean_title: {
    id: 'clean_title',
    fontFamily: 'Lato',
    fontWeight: 400,
    textTransform: 'title',
    maxLines: 3,
  },
  minimal: {
    id: 'minimal',
    fontFamily: 'Roboto Mono',
    fontWeight: 300,
    textTransform: 'none',
    maxLines: 2,
  },
};

const COLOR_PRESETS: Record<string, design.ColorPreset> = {
  white_on_black: {
    id: 'white_on_black',
    background: 'transparent',
    foreground: '#ffffff',
  },
  black_on_white: {
    id: 'black_on_white',
    background: '#ffffff',
    foreground: '#000000',
  },
  gold_on_black: {
    id: 'gold_on_black',
    background: 'transparent',
    foreground: '#d4af37',
  },
};

const DEFAULT_LAYOUT_ID = 'bold_centered';
const DEFAULT_COLOR_ID = 'white_on_black';

// Shirt-safe print area at 300 DPI (standard DTG front print: ~12" × 14")
const PRINT_WIDTH_PX = 3600;
const PRINT_HEIGHT_PX = 4200;

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const tools: Anthropic.Tool[] = [
  {
    name: 'evaluate_slogan',
    description:
      'Evaluate a candidate slogan for quality and trademark risk before designing. ' +
      'Returns { ok: boolean, reasons: string[] }. Reject any slogan where ok is false.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slogan: { type: 'string', description: 'The candidate shirt slogan to evaluate.' },
      },
      required: ['slogan'],
    },
  },
  {
    name: 'render_svg',
    description:
      'Render a master SVG for a slogan using a layout and color preset, then upload it to ' +
      'storage. Returns { svg_url: string | null, metadata: object }. Pass svg_url directly ' +
      'as the svg_url argument to save_design.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slogan: { type: 'string', description: 'The slogan text to render.' },
        layout: {
          type: 'string',
          enum: Object.keys(LAYOUT_PRESETS),
          description: 'Layout preset ID. Defaults to bold_centered.',
        },
        color_scheme: {
          type: 'string',
          enum: Object.keys(COLOR_PRESETS),
          description: 'Color preset ID. Defaults to white_on_black.',
        },
      },
      required: ['slogan'],
    },
  },
  {
    name: 'save_design',
    description:
      'Persist a design to the database with approval_status "pending". ' +
      'Returns { id: string } — the newly created design row ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        niche_id: { type: 'string', description: 'UUID of the parent niche.' },
        slogan: { type: 'string', description: 'The slogan text for this design.' },
        svg_url: {
          type: 'string',
          description: 'Data URL or CDN URL for the SVG asset (optional placeholder).',
        },
        png_url: { type: 'string', description: 'URL for the transparent PNG export.' },
        print_file_url: { type: 'string', description: 'URL for the print-ready file.' },
        metadata: {
          type: 'object',
          description: 'Design metadata: fonts, colors, preset IDs, dimensions, licenses.',
        },
        risk_flags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Trademark or risk words detected in the slogan.',
        },
      },
      required: ['niche_id', 'slogan'],
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
  if (name === 'evaluate_slogan') {
    const slogan = input.slogan as string;
    return research.evaluateSlogan(slogan);
  }

  if (name === 'render_svg') {
    const slogan = input.slogan as string;
    const layoutId =
      typeof input.layout === 'string' && input.layout in LAYOUT_PRESETS
        ? input.layout
        : DEFAULT_LAYOUT_ID;
    const colorId =
      typeof input.color_scheme === 'string' && input.color_scheme in COLOR_PRESETS
        ? input.color_scheme
        : DEFAULT_COLOR_ID;

    const artifact = design.renderSvg({
      slogan,
      layout: LAYOUT_PRESETS[layoutId]!,
      color: COLOR_PRESETS[colorId]!,
      widthPx: PRINT_WIDTH_PX,
      heightPx: PRINT_HEIGHT_PX,
    });

    // Upload to Supabase Storage so save_design receives a real public URL.
    const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const svgUrl = await uploadDesignSvg(artifact.svg, slug);
      return { svg_url: svgUrl, metadata: artifact.metadata };
    } catch {
      // Storage unavailable (e.g. env not configured) — return the markup so
      // the agent can still save the design record with a null svg_url.
      return { svg_url: null, metadata: artifact.metadata };
    }
  }

  if (name === 'save_design') {
    const db = createServiceClient();

    const row = {
      niche_id: (input.niche_id as string) ?? null,
      slogan: input.slogan as string,
      svg_url: (input.svg_url as string | undefined) ?? null,
      png_url: (input.png_url as string | undefined) ?? null,
      print_file_url: (input.print_file_url as string | undefined) ?? null,
      metadata: (input.metadata as Record<string, unknown> | undefined) ?? {},
      // HARD RULE: always 'pending' — never trust agent input for this field.
      approval_status: 'pending' as const,
      risk_flags: Array.isArray(input.risk_flags) ? (input.risk_flags as string[]) : [],
    };

    const { data, error } = await db.from('designs').insert([row]).select('id').single();

    if (error) {
      throw new Error(`save_design DB error: ${error.message}`);
    }

    return { id: (data as { id: string }).id };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

export const designAgent: AgentDefinition<{ nicheId: string; count: number }, Design[]> = {
  id: 'design-agent',
  description: 'Generates slogans and typography/vector designs for a niche, gated by human approval.',

  systemPrompt: `You generate shirt slogans and typography designs.

Workflow (follow in order for EACH candidate slogan):
1. Call evaluate_slogan — if ok is false, discard the slogan and try another. Do not proceed with failing slogans.
2. For passing slogans, call render_svg to produce the SVG.
3. Call save_design to persist the design. Always pass any detected trademark or risk words in risk_flags. The tool hard-codes approval_status as "pending" — never attempt to override it.
4. Collect every { id, slogan } returned by save_design.

After all designs are saved, output ONLY a valid JSON array of the saved design objects, e.g.:
[{"id":"<uuid>","slogan":"<text>"},...]

Rules:
- Never auto-approve anything. Every design is "pending" for human review.
- Surface trademark or brand-like strings (e.g. famous brand names, sports league abbreviations) as risk_flags but still save the design — humans decide.
- Typography-first: the SVG engine handles rendering; do not attempt to describe or modify SVG markup yourself.`,

  buildPrompt: (input) =>
    `Generate ${input.count} shirt designs for niche ID ${input.nicheId}. ` +
    `Produce exactly ${input.count} passing designs (evaluate, render, save each one). ` +
    `Return a JSON array of the saved design objects with their IDs.`,

  tools,
  executeTool,

  parseOutput: (raw): Design[] => {
    // The agent should emit a JSON array of saved design objects. Gracefully
    // handle cases where the array is embedded in prose or the agent already
    // saved via tools and emits only partial data.
    try {
      // Try to extract a JSON array from the raw text.
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]) as unknown;
        if (Array.isArray(parsed)) {
          return parsed as Design[];
        }
      }
    } catch {
      // Fall through to empty fallback.
    }
    // If saves already happened via tools, return an empty array rather than
    // crashing — the DB rows exist regardless of what the model emits.
    return [];
  },
};
