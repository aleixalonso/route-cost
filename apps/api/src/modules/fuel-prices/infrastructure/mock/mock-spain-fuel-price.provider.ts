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
    if (request.coordinate.latitude > 43) {
      return Promise.resolve(baseResult([]));
    }

    return Promise.resolve(
      baseResult([
        station('mock-es-1', 41.387, 2.17, 1.609, 1.489),
        station('mock-es-2', 41.389, 2.171, 1.629, 1.509),
        station('mock-es-3', 41.394, 2.181, 1.579, 1.519),
        station('mock-es-4', 41.411, 2.191, 1.699, 1.559),
        station('mock-es-5', 41.43, 2.2, 1.549, 1.539),
        station('mock-es-6', 41.5, 2.21, 1.719, 1.579),
        {
          id: 'mock-es-stale',
          coordinate: { latitude: 41.388, longitude: 2.169 },
          countryCode: 'ES',
          prices: [
            {
              fuelProduct: 'petrol-95-e5',
              pricePerLitre: { amount: 1.1, currency: 'EUR' },
              updatedAt: '2026-07-24T08:00:00Z',
            },
          ],
        },
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
  stations: NearbyFuelPricesResult['stations'],
): NearbyFuelPricesResult {
  return {
    countryCode: 'ES',
    currency: 'EUR',
    sourceUpdatedAt: '2026-07-28T16:00:00Z',
    retrievedAt: '2026-07-28T17:00:00Z',
    stations,
    attribution: {
      label: 'Official fuel-price data for Spain',
      url: 'https://datos.gob.es/es/catalogo/e05068001-precio-de-carburantes-en-las-gasolineras-espanolas',
    },
  };
}

function station(
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
        updatedAt: '2026-07-28T15:00:00Z',
      },
      {
        fuelProduct: 'diesel-a',
        pricePerLitre: { amount: diesel, currency: 'EUR' },
        updatedAt: '2026-07-28T15:30:00Z',
      },
    ],
  };
}
