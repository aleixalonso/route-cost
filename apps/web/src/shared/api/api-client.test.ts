import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { apiRequest } from './api-client';
import { isApiError } from './api-error';

describe('apiRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends query parameters and validates successful responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ ok: true }),
    );

    const result = await apiRequest({
      path: '/example',
      query: new URLSearchParams({ query: 'abc' }),
      schema: z.object({ ok: z.literal(true) }),
    });

    expect(result).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/example?query=abc',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sends JSON bodies and preserves backend error codes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        { code: 'ROUTE_NOT_FOUND', message: 'No route.' },
        { status: 404 },
      ),
    );

    await expect(
      apiRequest({
        path: '/route-cost-estimates',
        method: 'POST',
        body: { ok: true },
        schema: z.object({ ok: z.boolean() }),
      }),
    ).rejects.toMatchObject({ code: 'ROUTE_NOT_FOUND', status: 404 });
  });

  it('fails malformed successful responses through schema validation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ ok: 'no' }),
    );

    await expect(
      apiRequest({
        path: '/example',
        schema: z.object({ ok: z.boolean() }),
      }),
    ).rejects.toBeInstanceOf(z.ZodError);
  });

  it('passes abort signals through fetch', async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new DOMException('Aborted', 'AbortError'),
    );

    await expect(
      apiRequest({
        path: '/example',
        schema: z.object({ ok: z.boolean() }),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(isApiError(new Error('plain'))).toBe(false);
  });
});
