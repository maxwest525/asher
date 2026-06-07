import { NextResponse } from 'next/server';
import { shopify } from '@pod/tools';
import { createServiceClient } from '@pod/db';

interface ShopifyOrderLineItem {
  product_id: number;
  quantity: number;
  price: string;
}

interface ShopifyOrderPaidPayload {
  id: number;
  line_items: ShopifyOrderLineItem[];
  total_price: string;
}

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

  const topic = req.headers.get('x-shopify-topic');
  if (topic !== 'orders/paid') {
    return NextResponse.json({ ok: true });
  }

  const payload = JSON.parse(rawBody) as ShopifyOrderPaidPayload;
  const db = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  for (const item of payload.line_items) {
    const { data: product } = await db
      .from('products')
      .select('id')
      .eq('shopify_product_id', String(item.product_id))
      .maybeSingle();

    if (!product) continue;

    const productId = product.id as string;
    const itemRevenue = parseFloat(item.price);

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
      .select('sales, revenue, conversions')
      .eq('product_id', productId)
      .eq('date', today)
      .eq('channel', 'shopify')
      .single();

    if (!existing) continue;

    await db
      .from('daily_metrics')
      .update({
        sales: (existing.sales as number) + 1,
        revenue: (existing.revenue as number) + itemRevenue,
        conversions: (existing.conversions as number) + 1,
      })
      .eq('product_id', productId)
      .eq('date', today)
      .eq('channel', 'shopify');
  }

  return NextResponse.json({ ok: true });
}
