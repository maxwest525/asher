import { Inngest } from 'inngest';

/** Inngest client — durable/scheduled workflow runner for the production agents. */
export const inngest = new Inngest({ id: 'pod-agent-os' });

/** Event names emitted by the dashboard and internal triggers. */
export type PodEvent =
  | 'pod/research.run'
  | 'pod/designs.generate'
  | 'pod/designs.approve'
  | 'pod/products.publish'
  | 'pod/analytics.winners'
  | 'pod/winners.scale';
