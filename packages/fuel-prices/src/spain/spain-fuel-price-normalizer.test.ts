import { describe, expect, it } from 'vitest';

import { normalizeSpainFuelPriceSource } from './spain-fuel-price-normalizer.js';

const retrievedAt = '2026-11-22T12:00:00.000Z';

function station(id: string, price: string, latitude = '40,1') {
  return {
    IDEESS: id,
    Latitud: latitude,
    'Longitud (WGS84)': '-3,2',
    'Precio Gasolina 95 E5': price,
    'Precio Gasoleo A': '1,4',
  };
}

describe('normalizeSpainFuelPriceSource', () => {
  it('normalizes valid rows and converts the Madrid source timestamp', () => {
    const snapshot = normalizeSpainFuelPriceSource(
      {
        Fecha: '22/11/2026 13:00:00',
        ListaEESSPrecio: [station('1', '1,5')],
      },
      retrievedAt,
    );

    expect(snapshot.result).toMatchObject({
      countryCode: 'ES',
      currency: 'EUR',
      sourceUpdatedAt: '2026-11-22T12:00:00.000Z',
      retrievedAt,
      isStale: false,
      attribution: { label: 'Official fuel-price data for Spain' },
    });
    expect(snapshot.validStationCount).toBe(1);
    expect(snapshot.result.stations[0]?.coordinate).toEqual({
      latitude: 40.1,
      longitude: -3.2,
    });
  });

  it('drops invalid coordinates and prices above ten', () => {
    const snapshot = normalizeSpainFuelPriceSource(
      {
        ListaEESSPrecio: [
          station('bad-coordinate', '1,5', '91'),
          station('bad-price', '10,1'),
        ],
      },
      retrievedAt,
    );

    expect(snapshot.invalidRecordCount).toBe(1);
    expect(snapshot.result.stations).toHaveLength(1);
    expect(snapshot.result.stations[0]?.prices).toEqual([
      {
        fuelProduct: 'diesel-a',
        pricePerLitre: { amount: 1.4, currency: 'EUR' },
      },
    ]);
  });

  it('merges duplicate IDEESS rows and keeps the cheapest price', () => {
    const snapshot = normalizeSpainFuelPriceSource(
      {
        ListaEESSPrecio: [station('same', '1,7'), station('same', '1,3')],
      },
      retrievedAt,
    );

    expect(snapshot.result.stations).toHaveLength(1);
    expect(
      snapshot.result.stations[0]?.prices.find(
        (price) => price.fuelProduct === 'petrol-95-e5',
      )?.pricePerLitre.amount,
    ).toBe(1.3);
  });
});
