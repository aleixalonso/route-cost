import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NearbyFuelPricesRequest } from '../index.js';
import { SpainFuelPriceUnavailableError } from './spain-fuel-price.errors.js';
import { createSpainFuelPriceProvider } from './spain-fuel-price-provider.js';

const request: NearbyFuelPricesRequest = {
  coordinate: { latitude: 40, longitude: -3 },
  fuelProduct: 'petrol-95-e5',
};
const payload = {
  ListaEESSPrecio: [
    {
      IDEESS: '1',
      Latitud: '40,1',
      'Longitud (WGS84)': '-3,2',
      'Precio Gasolina 95 E5': '1,5',
    },
  ],
};

function config(fetchImpl: typeof fetch) {
  return {
    sourceUrl: 'https://example.com/prices',
    requestTimeoutMs: 1000,
    cacheTtlMs: 1000,
    staleIfErrorMs: 2000,
    fetchImpl,
  };
}

afterEach(() => vi.useRealTimers());

describe('createSpainFuelPriceProvider cache', () => {
  it('serves a second call from cache', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(payload));
    const provider = createSpainFuelPriceProvider(config(fetchImpl));
    const first = await provider.getNearbyFuelPrices(request);
    const second = await provider.getNearbyFuelPrices(request);

    expect(second).toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('serves a stale snapshot when refresh fails within the stale window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-22T12:00:00Z'));
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(payload))
      .mockRejectedValueOnce(new Error('upstream down'));
    const provider = createSpainFuelPriceProvider(config(fetchImpl));
    await provider.getNearbyFuelPrices(request);
    vi.setSystemTime(new Date('2026-11-22T12:00:02Z'));

    const result = await provider.getNearbyFuelPrices(request);
    expect(result.isStale).toBe(true);
    expect(result.stations).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('propagates refresh failure after the stale window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-22T12:00:00Z'));
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(payload))
      .mockRejectedValueOnce(new Error('upstream down'));
    const provider = createSpainFuelPriceProvider(config(fetchImpl));
    await provider.getNearbyFuelPrices(request);
    vi.setSystemTime(new Date('2026-11-22T12:00:04Z'));

    await expect(provider.getNearbyFuelPrices(request)).rejects.toBeInstanceOf(
      SpainFuelPriceUnavailableError,
    );
  });
});
