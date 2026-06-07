import { env } from '../env.js';
import { request } from '../http.js';

/** Pinterest API client. Drives traffic via pins + boards. */

const BASE = 'https://api.pinterest.com/v5';

export interface PinInput {
  boardId: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${env.pinterest.accessToken}`,
    'Content-Type': 'application/json',
  };
}

interface PinterestPinResponse {
  id: string;
}

interface PinterestMetricsResponse {
  all_time: {
    pin_click?: number;
    outbound_click?: number;
  };
}

/** Create a pin for a product. */
export async function createPin(input: PinInput): Promise<{ id: string }> {
  const body = {
    board_id: input.boardId,
    title: input.title,
    description: input.description,
    link: input.link,
    media_source: {
      source_type: 'image_url',
      url: input.imageUrl,
    },
  };

  const res = await request<PinterestPinResponse>(`${BASE}/pins`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  return { id: res.id };
}

/** Read pin click metrics for the analytics loop. */
export async function getPinClicks(pinId: string): Promise<number> {
  const res = await request<PinterestMetricsResponse>(
    `${BASE}/pins/${pinId}/analytics?start_date=${thirtyDaysAgo()}&end_date=${today()}&metric_types=PIN_CLICK,OUTBOUND_CLICK`,
    { headers: headers() },
  );
  return (res.all_time.pin_click ?? 0) + (res.all_time.outbound_click ?? 0);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}
