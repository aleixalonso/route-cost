import {
  calculateFuelPriceSuggestion,
  type FuelProduct,
  type FuelStation,
  type NearbyFuelPricesResult,
  selectNearbyStations,
} from '@route-cost/fuel-prices';
import { z } from 'zod';

import type { McpConfig } from '../config.js';
import { fetchJson } from './http.js';

export const attributionUrl =
  'https://datos.gob.es/es/catalogo/e05068001-precio-de-carburantes-en-las-gasolineras-espanolas';
const stationSchema = z.object({
  IDEESS: z.string(),
  Latitud: z.string(),
  'Longitud (WGS84)': z.string(),
  'Precio Gasolina 95 E5': z.string().optional(),
  'Precio Gasoleo A': z.string().optional(),
  Rótulo: z.string().optional(),
  Dirección: z.string().optional(),
  Localidad: z.string().optional(),
  Provincia: z.string().optional(),
});
const sourceSchema = z.object({
  Fecha: z.string().optional(),
  ListaEESSPrecio: z.array(stationSchema),
});

function decimal(value: string | undefined, max: number): number | undefined {
  if (value === undefined || !/^-?\d+(?:,\d+)?$/.test(value.trim()))
    return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 && parsed <= max
    ? parsed
    : undefined;
}

function sourceDate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(
    value.trim(),
  );
  if (match === null) return undefined;
  const [, day, month, year, hour, minute, second] = match;
  const localAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  if (
    new Date(localAsUtc).getUTCDate() !== Number(day) ||
    new Date(localAsUtc).getUTCMonth() !== Number(month) - 1
  )
    return undefined;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(localAsUtc));
  const fields = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const offset =
    Date.UTC(
      Number(fields.year),
      Number(fields.month) - 1,
      Number(fields.day),
      Number(fields.hour),
      Number(fields.minute),
      Number(fields.second),
    ) - localAsUtc;
  return new Date(localAsUtc - offset).toISOString();
}

export async function suggestSpainFuelPrice(
  coordinate: { latitude: number; longitude: number },
  fuelProduct: FuelProduct,
  config: McpConfig,
  fetchImpl: typeof fetch,
) {
  if (config.FUEL_PRICE_PROVIDER_MODE === 'mock')
    throw new Error(
      'This server ships no mock fuel data; FUEL_PRICE_PROVIDER_MODE must be live.',
    );
  const data = await fetchJson(
    fetchImpl,
    'Spanish fuel prices',
    config.SPAIN_FUEL_PRICE_SOURCE_URL,
    {},
    20_000,
    sourceSchema,
  );
  const retrievedAt = new Date().toISOString();
  const updatedAt = sourceDate(data.Fecha);
  const stations: FuelStation[] = [];
  for (const row of data.ListaEESSPrecio) {
    const latitudeText = row.Latitud;
    const latitude = /^-?\d+(?:,\d+)?$/.test(latitudeText.trim())
      ? Number(latitudeText.replace(',', '.'))
      : undefined;
    const longitudeText = row['Longitud (WGS84)'];
    const longitude = /^-?\d+(?:,\d+)?$/.test(longitudeText.trim())
      ? Number(longitudeText.replace(',', '.'))
      : undefined;
    if (
      latitude === undefined ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude === undefined ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    )
      continue;
    const petrol = decimal(row['Precio Gasolina 95 E5'], 10);
    const diesel = decimal(row['Precio Gasoleo A'], 10);
    const prices = [
      ...(petrol === undefined
        ? []
        : [
            {
              fuelProduct: 'petrol-95-e5' as const,
              pricePerLitre: { amount: petrol, currency: 'EUR' },
            },
          ]),
      ...(diesel === undefined
        ? []
        : [
            {
              fuelProduct: 'diesel-a' as const,
              pricePerLitre: { amount: diesel, currency: 'EUR' },
            },
          ]),
    ];
    if (prices.length === 0) continue;
    stations.push({
      id: row.IDEESS,
      coordinate: { latitude, longitude },
      countryCode: 'ES',
      prices,
      ...(row['Rótulo'] ? { brand: row['Rótulo'] } : {}),
      ...(row['Dirección'] ? { address: row['Dirección'] } : {}),
      ...(row.Localidad ? { locality: row.Localidad } : {}),
      ...(row.Provincia ? { region: row.Provincia } : {}),
    });
  }
  const result: NearbyFuelPricesResult = {
    countryCode: 'ES',
    currency: 'EUR',
    stations,
    retrievedAt,
    ...(updatedAt === undefined ? {} : { sourceUpdatedAt: updatedAt }),
    isStale:
      updatedAt === undefined ||
      Date.now() - Date.parse(updatedAt) > 72 * 60 * 60 * 1000,
  };
  const selected = selectNearbyStations(result, coordinate, fuelProduct, {
    radiusStepsMetres: [5000, 10000, 25000],
    minStationCount: 5,
    maxStationCount: 30,
    maxDataAgeHours: 72,
  });
  if (selected.stations.length === 0)
    throw new Error(`No station within 25 km has ${fuelProduct}.`);
  const suggestion = calculateFuelPriceSuggestion({ result, selected });
  return {
    fuelProduct,
    pricePerLitre: suggestion.suggestedPricePerLitre.amount,
    currency: suggestion.suggestedPricePerLitre.currency,
    stationCount: suggestion.stationCount,
    radiusMetres: suggestion.radiusMetres,
    sourceUrl: config.SPAIN_FUEL_PRICE_SOURCE_URL,
    ...(updatedAt === undefined ? {} : { sourceUpdatedAt: updatedAt }),
    retrievedAt,
    isStale: result.isStale ?? false,
    attributionUrl,
  };
}
