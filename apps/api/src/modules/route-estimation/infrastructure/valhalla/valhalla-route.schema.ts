import { z } from 'zod';

const valhallaSummarySchema = z.object({
  length: z.number(),
  time: z.number(),
});

const valhallaLegSchema = z.object({
  shape: z.string().optional(),
});

export const valhallaTripSchema = z.object({
  summary: valhallaSummarySchema,
  legs: z.array(valhallaLegSchema).min(1),
});

export const valhallaRouteResponseSchema = z.object({
  trip: valhallaTripSchema,
  alternates: z
    .array(
      z.object({
        trip: valhallaTripSchema,
      }),
    )
    .optional(),
});

export const valhallaErrorResponseSchema = z
  .object({
    error: z.string().optional(),
    error_code: z.union([z.string(), z.number()]).optional(),
    status_code: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();
