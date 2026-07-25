import { afterEach, describe, expect, it, vi } from 'vitest';

import malformedResponseFixture from '../../../../../test/fixtures/valhalla/malformed-response.json';
import noRouteFixture from '../../../../../test/fixtures/valhalla/no-route.json';
import rateLimitFixture from '../../../../../test/fixtures/valhalla/rate-limit.json';
import routePrimaryFixture from '../../../../../test/fixtures/valhalla/route-primary.json';
import traceMotorwayFixture from '../../../../../test/fixtures/valhalla/trace-motorway.json';
import {
  ValhallaAuthenticationError,
  ValhallaInvalidResponseError,
  ValhallaRateLimitError,
  ValhallaRouteNotFoundError,
  ValhallaTimeoutError,
  ValhallaUnavailableError,
} from './valhalla.errors';
import { ValhallaHttpClient } from './valhalla-http.client';
import { valhallaRouteResponseSchema } from './valhalla-route.schema';
import { valhallaTraceAttributesResponseSchema } from './valhalla-trace-attributes.schema';

describe('ValhallaHttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it.each([
    [401, ValhallaAuthenticationError],
    [403, ValhallaAuthenticationError],
  ])('maps %s responses to authentication errors', async (status, error) => {
    mockFetch(response({}, status));

    await expect(
      client().post('/route/v1', {}, valhallaRouteResponseSchema),
    ).rejects.toBeInstanceOf(error);
  });

  it('maps rate limit responses', async () => {
    mockFetch(response(rateLimitFixture, 429));

    await expect(
      client().post('/route/v1', {}, valhallaRouteResponseSchema),
    ).rejects.toBeInstanceOf(ValhallaRateLimitError);
  });

  it('maps timeouts', async () => {
    vi.useFakeTimers();
    mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const request = client({ requestTimeoutMs: 1 }).post(
      '/route/v1',
      {},
      valhallaRouteResponseSchema,
    );
    const expectation =
      expect(request).rejects.toBeInstanceOf(ValhallaTimeoutError);

    await vi.advanceTimersByTimeAsync(1);

    await expectation;
  });

  it('maps upstream 5xx responses', async () => {
    mockFetch(response({}, 503));

    await expect(
      client().post('/route/v1', {}, valhallaRouteResponseSchema),
    ).rejects.toBeInstanceOf(ValhallaUnavailableError);
  });

  it('rejects invalid JSON', async () => {
    mockFetch(new Response('not-json', { status: 200 }));

    await expect(
      client().post('/route/v1', {}, valhallaRouteResponseSchema),
    ).rejects.toBeInstanceOf(ValhallaInvalidResponseError);
  });

  it('rejects schema mismatches', async () => {
    mockFetch(response(malformedResponseFixture, 200));

    await expect(
      client().post('/route/v1', {}, valhallaRouteResponseSchema),
    ).rejects.toBeInstanceOf(ValhallaInvalidResponseError);
  });

  it('maps no-route responses', async () => {
    mockFetch(response(noRouteFixture, 400));

    await expect(
      client().post('/route/v1', {}, valhallaRouteResponseSchema),
    ).rejects.toBeInstanceOf(ValhallaRouteNotFoundError);
  });

  it('validates successful route responses', async () => {
    mockFetch(response(routePrimaryFixture, 200));

    await expect(
      client().post('/route/v1', {}, valhallaRouteResponseSchema),
    ).resolves.toMatchObject({
      trip: { legs: [{ shape: 'encoded-primary' }] },
    });
  });

  it('validates successful trace responses', async () => {
    mockFetch(response(traceMotorwayFixture, 200));

    await expect(
      client().post(
        '/trace_attributes/v1',
        {},
        valhallaTraceAttributesResponseSchema,
      ),
    ).resolves.toMatchObject({ edges: [{ road_class: 'motorway' }] });
  });

  it('does not place API keys in URLs or errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({}, 403));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      client({ apiKey: 'secret-key' }).post(
        '/route/v1',
        {},
        valhallaRouteResponseSchema,
      ),
    ).rejects.not.toThrow('secret-key');

    const url = fetchMock.mock.calls[0]?.[0];
    expect(String(url)).not.toContain('secret-key');
    expect(String(url)).not.toContain('api_key');
  });
});

function client(
  overrides: Partial<ConstructorParameters<typeof ValhallaHttpClient>[0]> = {},
) {
  return new ValhallaHttpClient({
    baseUrl: 'https://api-eu.stadiamaps.com',
    routePath: '/route/v1',
    traceAttributesPath: '/trace_attributes/v1',
    apiKey: 'test-key',
    clientId: 'route-cost-test',
    requestTimeoutMs: 8_000,
    maxAlternatives: 2,
    ...overrides,
  });
}

function response(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-request-id': 'req-1' },
  });
}

function mockFetch(fetchImplementation: typeof fetch): void;
function mockFetch(responseValue: Response): void;
function mockFetch(
  fetchImplementationOrResponse: typeof fetch | Response,
): void {
  const fetchMock =
    fetchImplementationOrResponse instanceof Response
      ? vi.fn().mockResolvedValue(fetchImplementationOrResponse)
      : vi.fn(fetchImplementationOrResponse);
  vi.stubGlobal('fetch', fetchMock);
}
