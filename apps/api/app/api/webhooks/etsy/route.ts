import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createServiceClient } from '@pod/db';
import { getReceipt } from '@pod/tools/etsy';

interface EtsyReceiptWebhookPayload {
  event_type: string;
  shop_id: number;
  data: { receipt_id: number };
}

export async function POST(req: Request) {
  const secret = process.env.ETSY_CLIENT_SECRET;
  const shopId = process.env.ETSY_SHOP_ID;
  const signature = req.headers.get('x-signature');

  if (!secret || !shopId || !signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 401 });
  }

  const rawBody = await req.text();

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(signature, 'utf8');

  if (
    expectedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as EtsyReceiptWebhookPayload;

  if (payload.event_type !== 'orders:receipt') {
    return NextResponse.json({ ok: true });
  }

  const receiptId = payload.data.receipt_id;
  const receipt = await getReceipt(shopId, receiptId);

  if (!receipt.was_paid) {
    return NextResponse.json({ ok: true });
  }

  const db = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  for (const tx of receipt.transactions) {
    const { data: product } = await db
      .from('products')
      .select('id')
      .eq('etsy_listing_id', String(tx.listing_id))
      .maybeSingle();

    if (!product) continue;

    const productId = product.id as string;
    const itemRevenue = (tx.price.amount / tx.price.divisor) * tx.quantity;

    await db.from('daily_metrics').upsert(
      {
        product_id: productId,
        date: today,
        channel: 'etsy',
        sales: 0,
        fulfillment_cost: 0,
        revenue: 0,
        sessions: 0,
        conversions: 0,
        clicks: 0,
        is_estimated: false,
      },
      { onConflict: 'product_id,date,channel', ignoreDuplicates: true },
    );

    const { data: existing } = await db
      .from('daily_metrics')
      .select('sales, revenue, conversions')
      .eq('product_id', productId)
      .eq('date', today)
      .eq('channel', 'etsy')
      .single();

    if (!existing) continue;

    await db
      .from('daily_metrics')
      .update({
        sales: (existing.sales as number) + tx.quantity,
        revenue: (existing.revenue as number) + itemRevenue,
        conversions: (existing.conversions as number) + 1,
      })
      .eq('product_id', productId)
      .eq('date', today)
      .eq('channel', 'etsy');
  }

  return NextResponse.json({ ok: true });
}
