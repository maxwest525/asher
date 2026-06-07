import { NextResponse } from 'next/server';
import { shopify } from '@pod/tools';

/**
 * Shopify webhook handler. Verifies the HMAC signature before doing anything,
 * and must be idempotent (Shopify can deliver the same event more than once).
 */
export async function POST(req: Request) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const hmac = req.headers.get('x-shopify-hmac-sha256');
  if (!secret || !hmac) {
    return NextResponse.json({ error: 'missing signature' }, { status: 401 });
  }

  const rawBody = await req.text();
  if (!shopify.verifyWebhookHmac(rawBody, hmac, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  // TODO: parse the payload and upsert into @pod/db idempotently
  // (key on the Shopify event/order id).
  return NextResponse.json({ ok: true });
}
