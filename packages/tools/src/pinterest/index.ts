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

/** Create a pin for a product. */
export async function createPin(_input: PinInput): Promise<{ id: string }> {
  void BASE;
  void headers;
  void request;
  // TODO: POST {BASE}/pins
  throw new Error('not implemented: createPin');
}

/** Read pin click metrics for the analytics loop. */
export async function getPinClicks(_pinId: string): Promise<number> {
  throw new Error('not implemented: getPinClicks');
}
