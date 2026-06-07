import { NextResponse } from 'next/server';
import { inngest, type PodEvent } from '../../../src/inngest/client';

const ALLOWED: PodEvent[] = [
  'pod/research.run',
  'pod/designs.generate',
  'pod/designs.approve',
  'pod/products.publish',
  'pod/analytics.winners',
  'pod/winners.scale',
];

/** Dashboard buttons POST here; we validate and forward to Inngest. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { event?: string } | null;
  const event = body?.event;

  if (!event || !ALLOWED.includes(event as PodEvent)) {
    return NextResponse.json({ error: 'unknown or missing event' }, { status: 400 });
  }

  await inngest.send({ name: event });
  return NextResponse.json({ ok: true, event });
}
