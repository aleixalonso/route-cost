import { Injectable } from '@nestjs/common';
import type {
  CountryFuelPriceProvider,
  NearbyFuelPricesRequest,
  NearbyFuelPricesResult,
} from '@route-cost/fuel-prices';

@Injectable()
export class MockSpainFuelPriceProvider implements CountryFuelPriceProvider {
  public readonly countryCode = 'ES';

  public getNearbyFuelPrices(
    request: NearbyFuelPricesRequest,
  ): Promise<NearbyFuelPricesResult> {
    const now = new Date();

    if (request.coordinate.latitude > 43) {
      return Promise.resolve(baseResult(now, []));
    }

    return Promise.resolve(
      baseResult(now, [
        station(now, 'mock-es-1', 41.387, 2.17, 1.609, 1.489),
        station(now, 'mock-es-2', 41.389, 2.171, 1.629, 1.509),
        station(now, 'mock-es-3', 41.394, 2.181, 1.579, 1.519),
        station(now, 'mock-es-4', 41.411, 2.191, 1.699, 1.559),
        station(now, 'mock-es-5', 41.43, 2.2, 1.549, 1.539),
        station(now, 'mock-es-6', 41.5, 2.21, 1.719, 1.579),
        staleStation(now),
        {
          id: 'mock-es-missing',
          coordinate: { latitude: 41.389, longitude: 2.168 },
          countryCode: 'ES',
          prices: [],
        },
      ]),
    );
  }
}

function baseResult(
  now: Date,
  stations: NearbyFuelPricesResult['stations'],
): NearbyFuelPricesResult {
  return {
    countryCode: 'ES',
    currency: 'EUR',
    sourceUpdatedAt: new Date(now.getTime() - 3_600_000).toISOString(),
    retrievedAt: now.toISOString(),
    stations,
    attribution: {
      label: 'Official fuel-price data for Spain',
      url: 'https://datos.gob.es/es/catalogo/e05068001-precio-de-carburantes-en-las-gasolineras-espanolas',
    },
  };
}

function station(
  now: Date,
  id: string,
  latitude: number,
  longitude: number,
  petrol: number,
  diesel: number,
): NearbyFuelPricesResult['stations'][number] {
  return {
    id,
    name: `Mock station ${id}`,
    coordinate: { latitude, longitude },
    locality: 'Barcelona',
    region: 'Barcelona',
    countryCode: 'ES',
    prices: [
      {
        fuelProduct: 'petrol-95-e5',
        pricePerLitre: { amount: petrol, currency: 'EUR' },
        updatedAt: new Date(now.getTime() - 60_000).toISOString(),
      },
      {
        fuelProduct: 'diesel-a',
        pricePerLitre: { amount: diesel, currency: 'EUR' },
        updatedAt: new Date(now.getTime() - 30_000).toISOString(),
      },
    ],
  };
}

function staleStation(now: Date): NearbyFuelPricesResult['stations'][number] {
  return {
    id: 'mock-es-stale',
    coordinate: { latitude: 41.388, longitude: 2.169 },
    countryCode: 'ES',
    prices: [
      {
        fuelProduct: 'petrol-95-e5',
        pricePerLitre: { amount: 1.1, currency: 'EUR' },
        updatedAt: new Date(now.getTime() - 4 * 24 * 3_600_000).toISOString(),
      },
    ],
  };
}
