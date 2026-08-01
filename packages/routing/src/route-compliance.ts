import type {
  RouteCharacteristics,
  RouteFeatureDetection,
} from './route-characteristics.js';
import type { RoutePreferences } from './route-preferences.js';

export type RoutePreferenceConflict =
  'tolls-present' | 'motorways-present' | 'ferries-present';

export interface RoutePreferenceCompliance {
  readonly conflicts: readonly RoutePreferenceConflict[];
}

/**
 * Compares requested avoidance preferences against the observed
 * characteristics of the route that was actually returned.
 *
 * A conflict is only reported when the characteristic is known to be present.
 * Unknown detection never produces a conflict and never produces an
 * "all clear": it is surfaced separately as unknown data.
 *
 * Priority is a routing strategy, not an avoidance preference, so it never
 * produces a compliance conflict.
 *
 * Conflict ordering is stable: tolls, motorways, ferries.
 */
export function calculateRoutePreferenceCompliance(
  preferences: RoutePreferences,
  characteristics: RouteCharacteristics,
): RoutePreferenceCompliance {
  const conflicts: RoutePreferenceConflict[] = [];

  if (preferences.avoidTolls && isPresent(characteristics.tolls)) {
    conflicts.push('tolls-present');
  }

  if (preferences.avoidMotorways && isPresent(characteristics.motorways)) {
    conflicts.push('motorways-present');
  }

  if (preferences.avoidFerries && isPresent(characteristics.ferries)) {
    conflicts.push('ferries-present');
  }

  return { conflicts };
}

function isPresent(detection: RouteFeatureDetection): boolean {
  return detection.status === 'known' && detection.present;
}
