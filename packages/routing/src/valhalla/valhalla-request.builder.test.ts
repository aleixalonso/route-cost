import { describe, expect, it } from 'vitest';

import type { RoutePreferences } from '../index.js';
import type { ValhallaCostingOptions } from './valhalla-config.js';
import {
  buildValhallaRouteRequest,
  buildValhallaTraceAttributesRequest,
  traceAttributeFilter,
} from './valhalla-request.builder.js';

const baseRequest = {
  origin: { latitude: 41.3902, longitude: 2.154 },
  destination: { latitude: 41.5912, longitude: 1.5209 },
  vehicleCategory: 'car',
} as const;

const defaultPreferences: RoutePreferences = {
  avoidTolls: false,
  avoidMotorways: false,
  avoidFerries: false,
  priority: 'fastest',
};

describe('valhalla request builder', () => {
  it('builds a car route request with explicit auto costing options', () => {
    expect(
      buildValhallaRouteRequest(
        baseRequest,
        'auto',
        config(),
        autoCosting(defaultPreferences),
      ),
    ).toEqual({
      locations: [
        { lat: 41.3902, lon: 2.154 },
        { lat: 41.5912, lon: 1.5209 },
      ],
      costing: 'auto',
      units: 'kilometers',
      directions_type: 'none',
      costing_options: autoCosting(defaultPreferences),
    });
  });

  it('builds a motorcycle route request', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, vehicleCategory: 'motorcycle' },
        'motorcycle',
        config(),
        motorcycleCosting(defaultPreferences),
      ),
    ).toMatchObject({
      costing: 'motorcycle',
      costing_options: motorcycleCosting(defaultPreferences),
    });
  });

  it('builds a maxi-scooter request with the motorcycle profile', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, vehicleCategory: 'maxi-scooter' },
        'motorcycle',
        config(),
        motorcycleCosting(defaultPreferences),
      ).costing,
    ).toBe('motorcycle');
  });

  it('builds a low-speed-scooter request with conservative options', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, vehicleCategory: 'low-speed-scooter' },
        'motor_scooter',
        config(),
        motorScooterCosting(defaultPreferences),
      ),
    ).toMatchObject({
      costing: 'motor_scooter',
      costing_options: motorScooterCosting(defaultPreferences),
    });
  });

  it('omits zero alternatives', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, alternatives: 0 },
        'auto',
        config(),
        autoCosting(defaultPreferences),
      ),
    ).not.toHaveProperty('alternates');
  });

  it('uses the maximum configured alternatives', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, alternatives: 2 },
        'auto',
        config(),
        autoCosting(defaultPreferences),
      ),
    ).toMatchObject({ alternates: 2 });
  });

  it('clamps alternatives to the configured maximum', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, alternatives: 3 },
        'auto',
        config(),
        autoCosting(defaultPreferences),
      ),
    ).toMatchObject({ alternates: 2 });
  });

  it('builds a trace attributes request with the same costing options', () => {
    const costingOptions = motorcycleCosting(defaultPreferences);

    expect(
      buildValhallaTraceAttributesRequest(
        'encoded',
        'motorcycle',
        costingOptions,
      ),
    ).toEqual({
      encoded_polyline: 'encoded',
      costing: 'motorcycle',
      shape_match: 'edge_walk',
      filters: {
        action: 'include',
        attributes: traceAttributeFilter,
      },
      costing_options: costingOptions,
    });
  });

  it('includes only the required trace attribute list', () => {
    expect(traceAttributeFilter).toEqual([
      'edge.length',
      'edge.speed',
      'edge.speed_limit',
      'edge.road_class',
      'edge.use',
      'edge.toll',
      'edge.unpaved',
      'edge.surface',
      'edge.density',
      'edge.weighted_grade',
      'edge.max_upward_grade',
      'edge.max_downward_grade',
      'edge.mean_elevation',
      'edge.begin_shape_index',
      'edge.end_shape_index',
    ]);
  });
});

function config() {
  return { maxAlternatives: 2 };
}

function autoCosting(preferences: RoutePreferences): ValhallaCostingOptions {
  return {
    auto: {
      use_tolls: preferences.avoidTolls ? 0 : 1,
      use_highways: preferences.avoidMotorways ? 0 : 1,
      use_ferry: preferences.avoidFerries ? 0 : 1,
      use_rail_ferry: preferences.avoidFerries ? 0 : 1,
      use_distance: preferences.priority === 'fastest' ? 0 : 1,
    },
  };
}

function motorcycleCosting(
  preferences: RoutePreferences,
): ValhallaCostingOptions {
  return {
    motorcycle: {
      use_tolls: preferences.avoidTolls ? 0 : 1,
      use_highways: preferences.avoidMotorways ? 0 : 1,
      use_ferry: preferences.avoidFerries ? 0 : 1,
      use_rail_ferry: preferences.avoidFerries ? 0 : 1,
      use_unpaved: 0,
      shortest: preferences.priority === 'shortest',
    },
  };
}

function motorScooterCosting(
  preferences: RoutePreferences,
): ValhallaCostingOptions {
  return {
    motor_scooter: {
      use_ferry: preferences.avoidFerries ? 0 : 1,
      use_rail_ferry: preferences.avoidFerries ? 0 : 1,
      top_speed: 45,
      shortest: preferences.priority === 'shortest',
    },
  };
}
