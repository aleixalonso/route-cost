import { z } from 'zod';

import type { McpConfig } from '../config.js';
import { toolError } from '../errors.js';
import { suggestSpainFuelPrice } from '../infrastructure/spain-fuel-prices.js';

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
