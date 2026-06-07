import { createServiceClient } from './index.js';

const DESIGNS_BUCKET = 'designs';

/**
 * Uploads SVG markup to the public `designs` Supabase Storage bucket.
 * Returns the public CDN URL of the stored file.
 *
 * Uses a caller-supplied slug (e.g. a UUID) to build the storage path so the
 * URL is stable and deterministic.
 */
export async function uploadDesignSvg(svgContent: string, slug: string): Promise<string> {
  const db = createServiceClient();
  const path = `${slug}.svg`;

  const { error } = await db.storage
    .from(DESIGNS_BUCKET)
    .upload(path, Buffer.from(svgContent, 'utf-8'), {
      contentType: 'image/svg+xml',
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = db.storage.from(DESIGNS_BUCKET).getPublicUrl(path);

  return publicUrl;
}
