import { z } from 'zod';

const nullableNumberSchema = z.number().nullable().optional();
const nullableStringSchema = z.string().nullable().optional();
const nullableBooleanSchema = z.boolean().nullable().optional();

export const valhallaTraceEdgeSchema = z.object({
  length: z.number(),
  speed: nullableNumberSchema,
  speed_limit: nullableNumberSchema,
  road_class: nullableStringSchema,
  use: nullableStringSchema,
  toll: nullableBooleanSchema,
  unpaved: nullableBooleanSchema,
  surface: nullableStringSchema,
  density: nullableNumberSchema,
  weighted_grade: nullableNumberSchema,
  max_upward_grade: nullableNumberSchema,
  max_downward_grade: nullableNumberSchema,
  mean_elevation: nullableNumberSchema,
  begin_shape_index: z.number().int(),
  end_shape_index: z.number().int(),
});

export const valhallaTraceAttributesResponseSchema = z.object({
  edges: z.array(valhallaTraceEdgeSchema),
});
