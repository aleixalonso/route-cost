import { z } from 'zod';

export const routeFeatureDetectionSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('known'),
    present: z.boolean(),
    distanceMetres: z.number().finite().nonnegative(),
    segmentCount: z.number().int().nonnegative(),
  }),
  z.object({
    status: z.literal('unknown'),
  }),
]);

export const routeCharacteristicsSchema = z.object({
  tolls: routeFeatureDetectionSchema,
  motorways: routeFeatureDetectionSchema,
  ferries: routeFeatureDetectionSchema,
});

export const routePreferenceConflictSchema = z.enum([
  'tolls-present',
  'motorways-present',
  'ferries-present',
]);

export const routePreferenceComplianceSchema = z.object({
  conflicts: z.array(routePreferenceConflictSchema).readonly(),
});

export type RouteFeatureDetection = z.infer<typeof routeFeatureDetectionSchema>;

export type RouteCharacteristics = z.infer<typeof routeCharacteristicsSchema>;

export type RoutePreferenceCompliance = z.infer<
  typeof routePreferenceComplianceSchema
>;
