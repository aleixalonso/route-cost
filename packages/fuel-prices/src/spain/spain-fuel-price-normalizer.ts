import type * as FuelPrices from '../index.js';
import { parseSpainCoordinate } from './spain-coordinate.parser.js';
import { SpainFuelPriceInvalidResponseError } from './spain-fuel-price.errors.js';
import type { SpainFuelPriceSourceStation } from './spain-fuel-price-source.schema.js';
import { spainFuelPriceSourceSchema } from './spain-fuel-price-source.schema.js';
import { spainFuelProductFields } from './spain-fuel-product.mapper.js';
import { parseSpainDecimal } from './spain-number.parser.js';

export interface SpainNormalizedSnapshot {
  readonly result: FuelPrices.NearbyFuelPricesResult;
  readonly validStationCount: number;
  readonly invalidRecordCount: number;
}

export function normalizeSpainFuelPriceSource(
  payload: unknown,
  retrievedAt: string,
  isStale = false,
): SpainNormalizedSnapshot {
  const parsed = spainFuelPriceSourceSchema.safeParse(payload);

  if (!parsed.success) {
    throw new SpainFuelPriceInvalidResponseError();
  }

  const stationsById = new Map<string, FuelPrices.FuelStation>();
  let invalidRecordCount = 0;

  for (const sourceStation of parsed.data.ListaEESSPrecio) {
    const normalizedStation = normalizeStation(sourceStation);

    if (normalizedStation === undefined) {
      invalidRecordCount += 1;
      continue;
    }

    const current = stationsById.get(normalizedStation.id);

    if (current === undefined) {
      stationsById.set(normalizedStation.id, normalizedStation);
    } else {
      stationsById.set(normalizedStation.id, {
        ...current,
        prices: mergePrices(current.prices, normalizedStation.prices),
      });
    }
  }

  const sourceUpdatedAt = parseSpainTimestamp(parsed.data.Fecha);
  const result: FuelPrices.NearbyFuelPricesResult = {
    countryCode: 'ES',
    currency: 'EUR',
    ...(sourceUpdatedAt === undefined ? {} : { sourceUpdatedAt }),
    retrievedAt,
    stations: [...stationsById.values()],
    attribution: {
      label: 'Official fuel-price data for Spain',
      url: 'https://datos.gob.es/es/catalogo/e05068001-precio-de-carburantes-en-las-gasolineras-espanolas',
    },
    isStale,
  };

  return {
    result,
    validStationCount: result.stations.length,
    invalidRecordCount,
  };
}

function normalizeStation(
  sourceStation: SpainFuelPriceSourceStation,
): FuelPrices.FuelStation | undefined {
  const latitude = parseSpainCoordinate(sourceStation.Latitud, 'lat');
  const longitude = parseSpainCoordinate(
    sourceStation['Longitud (WGS84)'],
    'lon',
  );

  if (latitude === undefined || longitude === undefined) {
    return undefined;
  }

  const prices: FuelPrices.StationFuelPrice[] = [];

  for (const [fuelProduct, fieldName] of Object.entries(
    spainFuelProductFields,
  ) as ReadonlyArray<[FuelPrices.FuelProduct, string]>) {
    const priceAmount = parseSpainDecimal(sourceStation[fieldName]);

    if (priceAmount === undefined) {
      continue;
    }

    prices.push({
      fuelProduct,
      pricePerLitre: { amount: priceAmount, currency: 'EUR' },
    });
  }

  if (prices.length === 0) {
    return undefined;
  }

  return {
    id: sourceStation.IDEESS,
    ...readOptional(sourceStation, 'Rótulo', 'brand'),
    ...readOptional(sourceStation, 'Dirección', 'address'),
    ...readOptional(sourceStation, 'Localidad', 'locality'),
    ...readOptional(sourceStation, 'Provincia', 'region'),
    coordinate: { latitude, longitude },
    countryCode: 'ES',
    prices,
  };
}

function mergePrices(
  currentPrices: readonly FuelPrices.StationFuelPrice[],
  nextPrices: readonly FuelPrices.StationFuelPrice[],
): readonly FuelPrices.StationFuelPrice[] {
  const pricesByProduct = new Map<
    FuelPrices.FuelProduct,
    FuelPrices.StationFuelPrice
  >();

  for (const price of [...currentPrices, ...nextPrices]) {
    const current = pricesByProduct.get(price.fuelProduct);

    if (
      current === undefined ||
      price.pricePerLitre.amount < current.pricePerLitre.amount
    ) {
      pricesByProduct.set(price.fuelProduct, price);
    }
  }

  return [...pricesByProduct.values()];
}

function readOptional(
  sourceStation: SpainFuelPriceSourceStation,
  sourceField: string,
  targetField: 'brand' | 'address' | 'locality' | 'region',
): Record<string, string> {
  const value = sourceStation[sourceField];

  if (typeof value !== 'string' || value.trim().length === 0) {
    return {};
  }

  return { [targetField]: value.trim() };
}

function parseSpainTimestamp(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(
    value.trim(),
  );

  if (match === null) {
    return undefined;
  }

  const [, day, month, year, hour, minute, second] = match;
  const localDateAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const offsetMs = getTimeZoneOffsetMs(
    new Date(localDateAsUtc),
    'Europe/Madrid',
  );

  return new Date(localDateAsUtc - offsetMs).toISOString();
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - date.getTime();
}
