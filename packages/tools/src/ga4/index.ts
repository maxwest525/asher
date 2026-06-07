import { env } from '../env.js';
import { request } from '../http.js';

/** Google Analytics 4 Data API client (runReport). */

export interface Ga4Row {
  date: string;
  productHandle: string;
  sessions: number;
  conversions: number;
}

/**
 * Run a GA4 report for product sessions/conversions over a date range.
 *
 * Auth note: GA4 Data API requires OAuth2 or a service account. This client
 * expects a bearer token via the `GA4_ACCESS_TOKEN` env var (short-lived OAuth
 * token or a token generated from a service account JSON key file). In
 * production, use the Google Auth Library to mint tokens automatically.
 */
export async function runProductReport(startDate: string, endDate: string): Promise<Ga4Row[]> {
  const propertyId = env.ga4.propertyId;
  const accessToken = process.env['GA4_ACCESS_TOKEN'];
  if (!accessToken) {
    throw new Error('GA4_ACCESS_TOKEN is required (OAuth2 bearer token for the GA4 Data API).');
  }

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  interface Ga4ReportResponse {
    rows?: Array<{
      dimensionValues: Array<{ value: string }>;
      metricValues: Array<{ value: string }>;
    }>;
  }

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: 'date' },
      { name: 'customEvent:product_handle' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'conversions' },
    ],
  };

  const res = await request<Ga4ReportResponse>(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.rows) return [];

  return res.rows.map((row) => ({
    date: row.dimensionValues[0]?.value ?? '',
    productHandle: row.dimensionValues[1]?.value ?? '',
    sessions: parseInt(row.metricValues[0]?.value ?? '0', 10),
    conversions: parseInt(row.metricValues[1]?.value ?? '0', 10),
  }));
}
