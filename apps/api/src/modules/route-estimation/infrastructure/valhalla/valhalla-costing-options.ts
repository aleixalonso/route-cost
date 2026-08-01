import type { RoutePreferences, RoutingProfile } from '@route-cost/routing';

import type { ValhallaCostingOptions } from './valhalla.types';

/**
 * Willingness factors used to express avoidance. Valhalla treats 0 as
 * "attempt to avoid" and never as an absolute prohibition: sometimes the
 * avoided feature is required to complete a route.
 */
export const VALHALLA_AVOID_FACTOR = 0;
export const VALHALLA_ALLOW_FACTOR = 1;

/**
 * Maps provider-neutral route preferences to Valhalla costing options.
 *
 * Pure, deterministic, and exhaustive for every supported profile. The
 * vehicle-category → profile resolution is deliberately not duplicated here;
 * callers resolve the profile first and pass it in.
 *
 * Profile-specific differences:
 * - `auto` expresses priority with `use_distance` (0 = fastest, 1 = shortest).
 *   `use_distance` is documented as available only for auto costing.
 * - `motorcycle` and `motor_scooter` express priority with the `shortest`
 *   boolean. Per Valhalla, `shortest: true` is purely distance-based costing
 *   and disables other costing factors and penalties.
 * - `motor_scooter` does not expose the same toll/highway willingness options
 *   as `auto` and `motorcycle` in Valhalla's public schema, so unsupported
 *   fields are omitted. Observed characteristics still report actual presence.
 * - Ferry avoidance maps to both road ferries and rail ferries because both are
 *   reported as user-facing ferries in RouteCost characteristics.
 */
export function buildValhallaCostingOptions(
  profile: RoutingProfile,
  preferences: RoutePreferences,
): ValhallaCostingOptions {
  switch (profile) {
    case 'auto':
      return {
        auto: {
          use_tolls: willingnessFactor(preferences.avoidTolls),
          use_highways: willingnessFactor(preferences.avoidMotorways),
          use_ferry: willingnessFactor(preferences.avoidFerries),
          use_rail_ferry: willingnessFactor(preferences.avoidFerries),
          use_distance: preferences.priority === 'fastest' ? 0 : 1,
        },
      };
    case 'motorcycle':
      return {
        motorcycle: {
          use_tolls: willingnessFactor(preferences.avoidTolls),
          use_highways: willingnessFactor(preferences.avoidMotorways),
          use_ferry: willingnessFactor(preferences.avoidFerries),
          use_rail_ferry: willingnessFactor(preferences.avoidFerries),
          use_unpaved: VALHALLA_AVOID_FACTOR,
          shortest: preferences.priority === 'shortest',
        },
      };
    case 'motor_scooter':
      return {
        motor_scooter: {
          use_ferry: willingnessFactor(preferences.avoidFerries),
          use_rail_ferry: willingnessFactor(preferences.avoidFerries),
          top_speed: 45,
          shortest: preferences.priority === 'shortest',
        },
      };
    default: {
      const exhaustive: never = profile;
      return exhaustive;
    }
  }
}

function willingnessFactor(avoid: boolean): number {
  return avoid ? VALHALLA_AVOID_FACTOR : VALHALLA_ALLOW_FACTOR;
}
