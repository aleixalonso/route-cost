import { fuelProducts } from '@route-cost/fuel-prices';
import { z } from 'zod';

import { coordinatesSchema } from '../route/coordinates.schema.js';

export const fuelProductSchema = z.enum(fuelProducts);

const vehicleIdSchema = z.string().trim().min(1).max(120);

export const fuelPriceSuggestionRequestSchema = z
  .object({
    coordinate: coordinatesSchema,
    vehicleId: vehicleIdSchema.optional(),
    fuelProduct: fuelProductSchema.optional(),
  })
  .superRefine((request, context) => {
    const hasVehicleId = request.vehicleId !== undefined;
    const hasFuelProduct = request.fuelProduct !== undefined;

    if (hasVehicleId === hasFuelProduct) {
      context.addIssue({
        code: 'custom',
        message: 'Provide exactly one of vehicleId or fuelProduct.',
        path: ['vehicleId'],
      });
    }
  });

const countrySchema = z.object({
  code: z.string().regex(/^[A-Z]{2}$/),
  name: z.string().min(1).optional(),
});

const attributionSchema = z.object({
  label: z.string().min(1),
  url: z.string().url().optional(),
});

const moneyPerLitreSchema = z.object({
  amount: z.number().finite().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

const suggestionSchema = z.object({
  suggestedPricePerLitre: moneyPerLitreSchema,
  method: z.enum(['nearby-median']),
  stationCount: z.number().int().positive(),
  radiusMetres: z.number().int().positive(),
  minimumPricePerLitre: z.number().finite().positive(),
  maximumPricePerLitre: z.number().finite().positive(),
  nearestStationDistanceMetres: z.number().finite().nonnegative(),
  farthestStationDistanceMetres: z.number().finite().nonnegative(),
  sourceUpdatedAt: z.string().datetime({ offset: true }).optional(),
  retrievedAt: z.string().datetime({ offset: true }),
  oldestPriceUpdatedAt: z.string().datetime({ offset: true }).optional(),
  newestPriceUpdatedAt: z.string().datetime({ offset: true }).optional(),
  isStale: z.boolean(),
  attribution: attributionSchema.optional(),
});

export const fuelPriceSuggestionResponseSchema = z.discriminatedUnion(
  'status',
  [
    z.object({
      status: z.literal('available'),
      country: countrySchema,
      fuelProduct: fuelProductSchema,
      suggestion: suggestionSchema,
    }),
    z.object({
      status: z.literal('unsupported-country'),
      country: countrySchema,
      fuelProduct: fuelProductSchema,
    }),
    z.object({
      status: z.literal('country-undetermined'),
      fuelProduct: fuelProductSchema,
    }),
    z.object({
      status: z.literal('no-nearby-prices'),
      country: countrySchema,
      fuelProduct: fuelProductSchema,
      maximumRadiusMetres: z.number().int().positive(),
    }),
  ],
);

export type FuelProduct = z.infer<typeof fuelProductSchema>;
export type FuelPriceSuggestionRequest = z.infer<
  typeof fuelPriceSuggestionRequestSchema
>;
export type FuelPriceSuggestionResponse = z.infer<
  typeof fuelPriceSuggestionResponseSchema
>;
