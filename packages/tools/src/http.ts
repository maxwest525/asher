/**
 * Shared HTTP helper with bounded retry + exponential backoff. Centralizes the
 * rate-limit/backoff behavior every external client should use.
 */

export interface RequestOptions extends RequestInit {
  /** Max retry attempts on 429/5xx (default 3). */
  retries?: number;
  /** Base backoff in ms (default 500). */
  backoffMs?: number;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    url: string,
  ) {
    super(`HTTP ${status} for ${url}: ${body.slice(0, 200)}`);
    this.name = 'HttpError';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { retries = 3, backoffMs = 500, ...init } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await sleep(backoffMs * 2 ** attempt);
          continue;
        }
      }
      const text = await res.text();
      if (!res.ok) throw new HttpError(res.status, text, url);
      return (text ? JSON.parse(text) : undefined) as T;
    } catch (err) {
      lastError = err;
      if (err instanceof HttpError || attempt >= retries) throw err;
      await sleep(backoffMs * 2 ** attempt);
    }
  }
  throw lastError;
}
