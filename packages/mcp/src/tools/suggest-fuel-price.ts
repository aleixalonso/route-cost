import {
  calculateFuelPriceSuggestion,
  type FuelProduct,
  type GeographicCoordinate,
  selectNearbyStations,
} from '@route-cost/fuel-prices';
import { z } from 'zod';

import type { McpConfig } from '../config.js';
import { toolError } from '../errors.js';
import { createFuelPriceProvider } from '../providers.js';

const attributionUrl =
  'https://datos.gob.es/es/catalogo/e05068001-precio-de-carburantes-en-las-gasolineras-espanolas';

export async function suggestSpainFuelPrice(
  coordinate: GeographicCoordinate,
  fuelProduct: FuelProduct,
  config: McpConfig,
  fetchImpl: typeof fetch,
) {
  if (config.FUEL_PRICE_PROVIDER_MODE === 'mock')
    throw new Error(
      'This server ships no mock fuel data; FUEL_PRICE_PROVIDER_MODE must be live.',
    );
  const result = await createFuelPriceProvider(
    config,
    fetchImpl,
  ).getNearbyFuelPrices({
    coordinate,
    fuelProduct,
  });
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
    ...(result.sourceUpdatedAt === undefined
      ? {}
      : { sourceUpdatedAt: result.sourceUpdatedAt }),
    retrievedAt: result.retrievedAt,
    isStale:
      result.sourceUpdatedAt === undefined ||
      Date.now() - Date.parse(result.sourceUpdatedAt) > 72 * 60 * 60 * 1000,
    attributionUrl: result.attribution?.url ?? attributionUrl,
  };
}

export const suggestFuelPriceInput = {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  fuelProduct: z.enum(['petrol-95-e5', 'diesel-a']).default('petrol-95-e5'),
};
export const suggestFuelPriceOutput = {
  fuelProduct: z.enum(['petrol-95-e5', 'diesel-a']),
  pricePerLitre: z.number(),
  currency: z.string(),
  stationCount: z.number(),
  radiusMetres: z.number(),
  sourceUrl: z.string(),
  sourceUpdatedAt: z.string().optional(),
  retrievedAt: z.string(),
  isStale: z.boolean(),
  attributionUrl: z.string(),
};

export async function suggestFuelPriceTool(
  args: {
    latitude: number;
    longitude: number;
    fuelProduct: 'petrol-95-e5' | 'diesel-a';
  },
  config: McpConfig,
  fetchImpl: typeof fetch,
) {
  try {
    const structuredContent = await suggestSpainFuelPrice(
      args,
      args.fuelProduct,
      config,
      fetchImpl,
    );
    return {
      content: [
        {
          type: 'text' as const,
          text: `${structuredContent.pricePerLitre} ${structuredContent.currency}/L from ${structuredContent.stationCount} nearby stations. Source: ${structuredContent.sourceUrl}${structuredContent.sourceUpdatedAt === undefined ? '' : ` (${structuredContent.sourceUpdatedAt})`}.`,
        },
      ],
      structuredContent,
    };
  } catch (error) {
    return toolError(error);
  }
}
