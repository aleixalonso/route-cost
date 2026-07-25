import { z } from 'zod';

export const roadCategorySchema = z.enum([
  'urban',
  'interurban',
  'motorway',
  'unknown',
]);

export const segmentClassificationReasonSchema = z.enum([
  'road-class-motorway',
  'urban-density',
  'urban-road-class',
  'interurban-road-class',
  'insufficient-data',
]);

export const routeDistanceSummarySchema = z.object({
  urbanDistanceMetres: z.number().nonnegative(),
  interurbanDistanceMetres: z.number().nonnegative(),
  motorwayDistanceMetres: z.number().nonnegative(),
  unknownDistanceMetres: z.number().nonnegative(),
});

export const routeSegmentSchema = z.object({
  distanceMetres: z.number().nonnegative(),
  beginShapeIndex: z.number().int().nonnegative(),
  endShapeIndex: z.number().int().nonnegative(),
  roadCategory: roadCategorySchema,
  classificationReason: segmentClassificationReasonSchema,
  expectedSpeedKmh: z.number().nonnegative().optional(),
  speedLimitKmh: z.number().nonnegative().optional(),
  roadClass: z.string().optional(),
  roadUse: z.string().optional(),
  density: z.number().optional(),
  toll: z.boolean().optional(),
  unpaved: z.boolean().optional(),
  surface: z.string().optional(),
  weightedGrade: z.number().optional(),
  maximumUpwardGrade: z.number().optional(),
  maximumDownwardGrade: z.number().optional(),
  meanElevationMetres: z.number().optional(),
});

export const routeAlternativeSchema = z.object({
  id: z.string().min(1),
  distanceMetres: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative(),
  encodedPolyline: z.string().min(1),
  summary: routeDistanceSummarySchema,
  segments: z.array(routeSegmentSchema),
});

export const estimateRouteResponseSchema = z.object({
  alternatives: z.array(routeAlternativeSchema),
});

export type EstimateRouteResponse = z.infer<typeof estimateRouteResponseSchema>;
