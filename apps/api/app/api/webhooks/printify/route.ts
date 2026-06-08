import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createServiceClient } from '@pod/db';

interface PrintifyFulfilledEvent {
  type: 'shop_order.fulfilled';
  shop_id: number;
  resource: {
    id: string;
    type: 'order';
    data: {
      line_items: Array<{
        product_id: string;
        variant_id: number;
        quantity: number;
        cost: number;
        shipping_cost?: number;
      }>;
    };
  };
}

interface PrintifyEvent {
  type: string;
  [key: string]: unknown;
}

export async function POST(req: Request) {
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'missing secret' }, { status: 401 });
  }

  const url = new URL(req.url);
  const providedSecret = url.searchParams.get('secret') ?? '';

  let secretsMatch = false;
  try {
    secretsMatch = crypto.timingSafeEqual(
      Buffer.from(secret),
      Buffer.from(providedSecret),
    );
  } catch {
    secretsMatch = false;
  }

  if (!secretsMatch) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 401 });
  }

  const rawBody = await req.text();
  const event = JSON.parse(rawBody) as PrintifyEvent;

  if (event.type !== 'shop_order.fulfilled') {
    return NextResponse.json({ ok: true });
  }

  const fulfilled = event as unknown as PrintifyFulfilledEvent;
  const lineItems = fulfilled.resource.data.line_items;
  const db = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  for (const item of lineItems) {
    const { data: product } = await db
      .from('products')
      .select('id')
      .eq('printify_product_id', item.product_id)
      .maybeSingle();

    if (!product) continue;

    const productId = product.id as string;
    const costDollars = item.cost / 100;

    await db.from('daily_metrics').upsert(
      {
        product_id: productId,
        date: today,
        channel: 'shopify',
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
      .select('sales, fulfillment_cost')
      .eq('product_id', productId)
      .eq('date', today)
      .eq('channel', 'shopify')
      .single();

    if (!existing) continue;

    await db
      .from('daily_metrics')
      .update({
        sales: (existing.sales as number) + 1,
        fulfillment_cost: (existing.fulfillment_cost as number) + costDollars,
      })
      .eq('product_id', productId)
      .eq('date', today)
      .eq('channel', 'shopify');
  }

  return NextResponse.json({ ok: true });
}
