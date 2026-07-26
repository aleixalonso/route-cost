import { afterEach, describe, expect, it, vi } from 'vitest';

import autocompleteFixture from '../../../../../test/fixtures/stadia-geocoding/autocomplete-results.json';
import providerErrorFixture from '../../../../../test/fixtures/stadia-geocoding/provider-error.json';
import searchFixture from '../../../../../test/fixtures/stadia-geocoding/search-results.json';
import {
  StadiaGeocodingAuthenticationError,
  StadiaGeocodingInvalidResponseError,
  StadiaGeocodingRateLimitError,
  StadiaGeocodingTimeoutError,
  StadiaGeocodingUnavailableError,
  StadiaLocationNotFoundError,
} from './stadia-geocoding.errors';
import type { StadiaGeocodingConfig } from './stadia-geocoding.types';
import { StadiaGeocodingHttpClient } from './stadia-geocoding-http.client';

const config: StadiaGeocodingConfig = {
  baseUrl: 'https://api-eu.stadiamaps.com',
  autocompletePath: '/geocoding/v2/autocomplete',
  searchPath: '/geocoding/v2/search',
  placeDetailsPath: '/geocoding/v2/place_details',
  reversePath: '/geocoding/v2/reverse',
  apiKey: 'secret-key',
  clientId: 'route-cost',
  requestTimeoutMs: 5,
  defaultLimit: 5,
  maxLimit: 10,
};

describe('StadiaGeocodingHttpClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends authentication headers and keeps the API key out of the URL', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, autocompleteFixture));
    const client = new StadiaGeocodingHttpClient(config);

    await client.autocomplete(
      new URL(
        'https://api-eu.stadiamaps.com/geocoding/v2/autocomplete?text=Pla',
      ),
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect((url as URL).toString()).not.toContain('secret-key');
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      'Stadia-Auth secret-key',
    );
    expect((init?.headers as Record<string, string>)['X-Client-Id']).toBe(
      'route-cost',
    );
  });

  it('parses successful search, details, and reverse responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      jsonResponse(200, searchFixture),
    );
    const client = new StadiaGeocodingHttpClient(config);

    await expect(client.search(new URL(config.baseUrl))).resolves.toBeDefined();
    await expect(
      client.placeDetails(new URL(config.baseUrl)),
    ).resolves.toBeDefined();
    await expect(
      client.reverse(new URL(config.baseUrl)),
    ).resolves.toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it.each([
    [401, StadiaGeocodingAuthenticationError],
    [403, StadiaGeocodingAuthenticationError],
    [429, StadiaGeocodingRateLimitError],
    [500, StadiaGeocodingUnavailableError],
    [503, StadiaGeocodingUnavailableError],
  ] as const)(
    'maps HTTP %s to a sanitized error',
    async (status, errorClass) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse(status, providerErrorFixture),
      );
      const client = new StadiaGeocodingHttpClient(config);

      await expect(client.search(new URL(config.baseUrl))).rejects.toThrow(
        errorClass,
      );
      await expect(client.search(new URL(config.baseUrl))).rejects.not.toThrow(
        'secret-key',
      );
    },
  );

  it('maps place details 404 to not found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(404, providerErrorFixture),
    );
    const client = new StadiaGeocodingHttpClient(config);

    await expect(client.placeDetails(new URL(config.baseUrl))).rejects.toThrow(
      StadiaLocationNotFoundError,
    );
  });

  it('maps invalid JSON and schema mismatch to invalid response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('not json', { status: 200 }),
    );
    const client = new StadiaGeocodingHttpClient(config);

    await expect(client.search(new URL(config.baseUrl))).rejects.toThrow(
      StadiaGeocodingInvalidResponseError,
    );

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse(200, {}));
    await expect(client.search(new URL(config.baseUrl))).rejects.toThrow(
      StadiaGeocodingInvalidResponseError,
    );
  });

  it('maps aborts to timeout and performs no automatic retry', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new DOMException('Aborted', 'AbortError'),
    );
    const client = new StadiaGeocodingHttpClient(config);

    await expect(client.search(new URL(config.baseUrl))).rejects.toThrow(
      StadiaGeocodingTimeoutError,
    );
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'request-1',
    },
  });
}
