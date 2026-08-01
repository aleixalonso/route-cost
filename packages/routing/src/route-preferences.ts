export type RoutePriority = 'fastest' | 'shortest';

export interface RoutePreferences {
  readonly avoidTolls: boolean;
  readonly avoidMotorways: boolean;
  readonly avoidFerries: boolean;
  readonly priority: RoutePriority;
}

export interface RoutePreferencesInput {
  readonly avoidTolls?: boolean | undefined;
  readonly avoidMotorways?: boolean | undefined;
  readonly avoidFerries?: boolean | undefined;
  readonly priority?: RoutePriority | undefined;
}

export const DEFAULT_ROUTE_PREFERENCES: RoutePreferences = Object.freeze({
  avoidTolls: false,
  avoidMotorways: false,
  avoidFerries: false,
  priority: 'fastest',
});

/**
 * Normalizes a partial preference object into the complete domain model.
 *
 * Omitted fields resolve to the centralized defaults. This is the single
 * normalization point between transport DTOs and the routing provider
 * abstraction; providers must not re-interpret partial objects.
 */
export function normalizeRoutePreferences(
  preferences: RoutePreferencesInput | undefined,
): RoutePreferences {
  return {
    avoidTolls: preferences?.avoidTolls ?? DEFAULT_ROUTE_PREFERENCES.avoidTolls,
    avoidMotorways:
      preferences?.avoidMotorways ?? DEFAULT_ROUTE_PREFERENCES.avoidMotorways,
    avoidFerries:
      preferences?.avoidFerries ?? DEFAULT_ROUTE_PREFERENCES.avoidFerries,
    priority: preferences?.priority ?? DEFAULT_ROUTE_PREFERENCES.priority,
  };
}
