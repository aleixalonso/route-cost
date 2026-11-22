import { z } from 'zod';

import { UpstreamError } from '../errors.js';

export async function fetchJson<T extends z.ZodType>(
  fetchImpl: typeof fetch,
  service: string,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  schema: T,
): Promise<z.output<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, signal: controller.signal });
    } catch {
      throw new UpstreamError(service);
    }
    if (!response.ok) throw new UpstreamError(service, response.status);
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new UpstreamError(service, response.status);
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new UpstreamError(service, response.status);
    return parsed.data;
  } finally {
    clearTimeout(timer);
  }
}
