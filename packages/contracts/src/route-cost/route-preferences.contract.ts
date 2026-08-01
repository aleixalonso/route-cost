import { z } from 'zod';

export const routePrioritySchema = z.enum(['fastest', 'shortest']);

/**
 * Transport-level preference input. The object may be partially supplied;
 * individual fields are optional and omitted fields resolve to the
 * centralized defaults in the routing domain package.
 *
 * Unknown fields are rejected: the preference set is closed for this
 * milestone and typos must not silently change routing behavior.
 */
export const routePreferencesInputSchema = z
  .object({
    avoidTolls: z.boolean().optional(),
    avoidMotorways: z.boolean().optional(),
    avoidFerries: z.boolean().optional(),
    priority: routePrioritySchema.optional(),
  })
  .strict();

/**
 * Complete normalized preferences as returned by the API. Never contains
 * provider-specific field names such as `use_tolls`.
 */
export const routePreferencesSchema = z
  .object({
    avoidTolls: z.boolean(),
    avoidMotorways: z.boolean(),
    avoidFerries: z.boolean(),
    priority: routePrioritySchema,
  })
  .strict();

export type RoutePriority = z.infer<typeof routePrioritySchema>;

export type RoutePreferences = z.infer<typeof routePreferencesSchema>;

export type RoutePreferencesInput = z.infer<typeof routePreferencesInputSchema>;
