import type {
  CountryFuelPriceProvider,
  CountryFuelPriceProviderRegistry,
  FuelPriceSearchConfig,
  FuelProduct,
  NearbyFuelPricesResult,
} from '@route-cost/fuel-prices';
import { describe, expect, it, vi } from 'vitest';

import type { CountryResolver } from './country-resolver';
import type { ResolveRequestedFuelProductService } from './resolve-requested-fuel-product.service';
import {
  SuggestFuelPriceService,
  toCountryResponse,
  toFuelPriceSearchConfig,
} from './suggest-fuel-price.service';

const searchConfig: FuelPriceSearchConfig = {
  radiusStepsMetres: [5_000, 10_000, 25_000],
  minStationCount: 1,
  maxStationCount: 30,
  maxDataAgeHours: 72,
};

describe('toCountryResponse', () => {
  it('renames country code and name to the contract shape', () => {
    expect(
      toCountryResponse({ countryCode: 'ES', countryName: 'Spain' }),
    ).toEqual({ code: 'ES', name: 'Spain' });
  });

  it('omits the name when the country resolver did not provide one', () => {
    expect(toCountryResponse({ countryCode: 'FR' })).toEqual({ code: 'FR' });
  });
});

describe('SuggestFuelPriceService', () => {
  it('returns an available suggestion for a supported country', async () => {
    const fuelPrices = service({
      country: { countryCode: 'ES', countryName: 'Spain' },
      provider: provider(),
    });

    await expect(
      fuelPrices.suggest({
        coordinate: { latitude: 41.387, longitude: 2.17 },
        fuelProduct: 'petrol-95-e5',
      }),
    ).resolves.toEqual({
      status: 'available',
      country: { code: 'ES', name: 'Spain' },
      fuelProduct: 'petrol-95-e5',
      suggestion: expect.objectContaining({
        suggestedPricePerLitre: { amount: 1.6, currency: 'EUR' },
        method: 'nearby-median',
        stationCount: 1,
        radiusMetres: 5_000,
        isStale: false,
        attribution: { label: 'Test attribution' },
      }),
    });
  });

  it('reports an unsupported country when no provider is registered', async () => {
    const fuelPrices = service({
      country: { countryCode: 'FR', countryName: 'France' },
    });

    await expect(
      fuelPrices.suggest({
        coordinate: { latitude: 48.8566, longitude: 2.3522 },
        fuelProduct: 'petrol-95-e5',
      }),
    ).resolves.toEqual({
      status: 'unsupported-country',
      country: { code: 'FR', name: 'France' },
      fuelProduct: 'petrol-95-e5',
    });
  });

  it('reports an undetermined country when resolution fails', async () => {
    const fuelPrices = service({});

    await expect(
      fuelPrices.suggest({
        coordinate: { latitude: 0, longitude: 0 },
        fuelProduct: 'petrol-95-e5',
      }),
    ).resolves.toEqual({
      status: 'country-undetermined',
      fuelProduct: 'petrol-95-e5',
    });
  });

  it('reports no nearby prices when the provider returns no usable stations', async () => {
    const fuelPrices = service({
      country: { countryCode: 'ES', countryName: 'Spain' },
      provider: provider({ stations: [] }),
    });

    await expect(
      fuelPrices.suggest({
        coordinate: { latitude: 44, longitude: 2 },
        fuelProduct: 'petrol-95-e5',
      }),
    ).resolves.toEqual({
      status: 'no-nearby-prices',
      country: { code: 'ES', name: 'Spain' },
      fuelProduct: 'petrol-95-e5',
      maximumRadiusMetres: 25_000,
    });
  });
});

describe('toFuelPriceSearchConfig', () => {
  it('parses radius steps and maps the fuel price limits', () => {
    expect(
      toFuelPriceSearchConfig({
        FUEL_PRICE_RADIUS_STEPS_METRES: '5000,10000,25000',
        FUEL_PRICE_MIN_STATION_COUNT: 5,
        FUEL_PRICE_MAX_STATION_COUNT: 30,
        FUEL_PRICE_MAX_DATA_AGE_HOURS: 72,
      }),
    ).toEqual({
      radiusStepsMetres: [5_000, 10_000, 25_000],
      minStationCount: 5,
      maxStationCount: 30,
      maxDataAgeHours: 72,
    });
  });
});

function service(options: {
  readonly country?:
    { readonly countryCode: string; readonly countryName?: string } | undefined;
  readonly provider?: CountryFuelPriceProvider;
}): SuggestFuelPriceService {
  const resolveRequestedFuelProduct = {
    resolve: vi.fn().mockReturnValue('petrol-95-e5' satisfies FuelProduct),
  } as unknown as ResolveRequestedFuelProductService;
  const countryResolver = {
    resolveCountry: vi.fn().mockResolvedValue(options.country),
  } as unknown as CountryResolver;
  const providerRegistry = {
    getProvider: vi.fn().mockReturnValue(options.provider),
  } as unknown as CountryFuelPriceProviderRegistry;

  return new SuggestFuelPriceService(
    resolveRequestedFuelProduct,
    countryResolver,
    providerRegistry,
    searchConfig,
  );
}

function provider(
  options: {
    readonly stations?: NearbyFuelPricesResult['stations'];
  } = {},
): CountryFuelPriceProvider {
  return {
    countryCode: 'ES',
    getNearbyFuelPrices: vi.fn().mockResolvedValue(
      nearbyResult(
        options.stations ?? [
          {
            id: 'test-1',
            name: 'Test station',
            coordinate: { latitude: 41.387, longitude: 2.17 },
            countryCode: 'ES',
            prices: [
              {
                fuelProduct: 'petrol-95-e5',
                pricePerLitre: { amount: 1.6, currency: 'EUR' },
                updatedAt: new Date(Date.now() - 60_000).toISOString(),
              },
            ],
          },
        ],
      ),
    ),
  };
}

function nearbyResult(
  stations: NearbyFuelPricesResult['stations'],
): NearbyFuelPricesResult {
  return {
    countryCode: 'ES',
    currency: 'EUR',
    sourceUpdatedAt: new Date(Date.now() - 3_600_000).toISOString(),
    retrievedAt: new Date().toISOString(),
    stations,
    attribution: { label: 'Test attribution' },
  };
}
