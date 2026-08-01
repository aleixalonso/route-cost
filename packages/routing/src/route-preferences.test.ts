import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ROUTE_PREFERENCES,
  normalizeRoutePreferences,
  type RoutePreferences,
} from './route-preferences.js';

describe('normalizeRoutePreferences', () => {
  it('resolves an omitted object to the centralized defaults', () => {
    expect(normalizeRoutePreferences(undefined)).toEqual(
      DEFAULT_ROUTE_PREFERENCES,
    );
  });

  it('resolves an empty object to the centralized defaults', () => {
    expect(normalizeRoutePreferences({})).toEqual(DEFAULT_ROUTE_PREFERENCES);
  });

  it('applies individual defaults for partially supplied objects', () => {
    expect(normalizeRoutePreferences({ avoidTolls: true })).toEqual({
      avoidTolls: true,
      avoidMotorways: false,
      avoidFerries: false,
      priority: 'fastest',
    });
  });

  it('preserves every supplied value', () => {
    const supplied: RoutePreferences = {
      avoidTolls: true,
      avoidMotorways: true,
      avoidFerries: true,
      priority: 'shortest',
    };

    expect(normalizeRoutePreferences(supplied)).toEqual(supplied);
  });

  it('does not mutate the input object', () => {
    const input = { avoidTolls: true };
    const snapshot = { ...input };

    normalizeRoutePreferences(input);

    expect(input).toEqual(snapshot);
  });

  it('keeps defaults immutable and frozen', () => {
    expect(DEFAULT_ROUTE_PREFERENCES).toEqual({
      avoidTolls: false,
      avoidMotorways: false,
      avoidFerries: false,
      priority: 'fastest',
    });
    expect(Object.isFrozen(DEFAULT_ROUTE_PREFERENCES)).toBe(true);
  });
});
