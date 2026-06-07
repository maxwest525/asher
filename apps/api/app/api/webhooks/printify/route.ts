import { NextResponse } from 'next/server';

/**
 * Printify webhook handler (order status / fulfillment). Verify authenticity,
 * then sync fulfillment cost + status into @pod/db idempotently for the
 * analytics loop. Skeleton — verification + persistence are TODO.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  void rawBody;
  // TODO: verify the Printify signature, then upsert order/fulfillment state
  // keyed on the Printify order id (idempotent).
  return NextResponse.json({ ok: true });
}
