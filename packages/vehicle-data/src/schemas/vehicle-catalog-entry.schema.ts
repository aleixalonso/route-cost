import { z } from 'zod';

const consumptionRateSchema = z.number().finite().positive().max(100);
const isoDateSchema = z.iso.date();

export const vehicleFuelTypeSchema = z.enum(['petrol', 'diesel']);

export const vehiclePowertrainTypeSchema = z.enum([
  'internal-combustion',
  'full-hybrid',
]);

export const consumptionDataStatusSchema = z.enum([
  'estimated',
  'partially-verified',
  'verified',
]);

export const consumptionDataConfidenceSchema = z.enum([
  'low',
  'medium',
  'high',
]);

export const vehicleDataSourceTypeSchema = z.enum([
  'manufacturer',
  'official-document',
  'independent-test',
  'derived',
]);

export const vehicleCatalogEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    manufacturer: z.string().trim().min(1),
    model: z.string().trim().min(1),
    variant: z.string().trim().min(1),
    displayName: z.string().trim().min(1),
    yearFrom: z.number().int().min(1990).max(2100),
    yearTo: z.number().int().min(1990).max(2100).optional(),
    vehicleCategory: z.enum([
      'car',
      'motorcycle',
      'maxi-scooter',
      'low-speed-scooter',
    ]),
    fuelType: vehicleFuelTypeSchema,
    powertrainType: vehiclePowertrainTypeSchema,
    engineDisplacementCc: z.number().int().positive().optional(),
    consumptionProfile: z.object({
      urbanLitresPer100Km: consumptionRateSchema,
      interurbanLitresPer100Km: consumptionRateSchema,
      motorwayLitresPer100Km: consumptionRateSchema,
      unknownLitresPer100Km: consumptionRateSchema,
    }),
    consumptionData: z.object({
      status: consumptionDataStatusSchema,
      confidence: consumptionDataConfidenceSchema,
      officialCombinedLitresPer100Km: consumptionRateSchema.optional(),
      methodology: z.string().trim().min(1),
      sources: z
        .array(
          z.object({
            type: vehicleDataSourceTypeSchema,
            title: z.string().trim().min(1),
            publisher: z.string().trim().min(1),
            url: z.url().refine((url) => url.startsWith('http'), {
              message: 'Source URL must use HTTP or HTTPS.',
            }),
            accessedAt: isoDateSchema,
            notes: z.string().trim().min(1).optional(),
          }),
        )
        .min(1),
    }),
  })
  .refine(
    (vehicle) =>
      vehicle.yearTo === undefined || vehicle.yearTo >= vehicle.yearFrom,
    {
      message: 'yearTo must not be earlier than yearFrom.',
      path: ['yearTo'],
    },
  );
