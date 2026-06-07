import { env } from '../env.js';

/** Google Analytics 4 Data API client (runReport). */

export interface Ga4Row {
  date: string;
  productHandle: string;
  sessions: number;
  conversions: number;
}

/**
 * Run a GA4 report for product sessions/conversions over a date range.
 * Uses the GA4 Data API `runReport`.
 */
export async function runProductReport(_startDate: string, _endDate: string): Promise<Ga4Row[]> {
  void env.ga4.propertyId;
  // TODO: call the GA4 Data API runReport with dimensions [date, customEvent:productHandle]
  // and metrics [sessions, conversions]. Auth via a service account.
  throw new Error('not implemented: runProductReport');
}
