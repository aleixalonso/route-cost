import { describe, expect, it } from 'vitest';

import {
  buildValhallaRouteRequest,
  buildValhallaTraceAttributesRequest,
  traceAttributeFilter,
} from './valhalla-request.builder';

const baseRequest = {
  origin: { latitude: 41.3902, longitude: 2.154 },
  destination: { latitude: 41.5912, longitude: 1.5209 },
  vehicleCategory: 'car',
} as const;

describe('valhalla request builder', () => {
  it('builds a car route request', () => {
    expect(buildValhallaRouteRequest(baseRequest, 'auto', config())).toEqual({
      locations: [
        { lat: 41.3902, lon: 2.154 },
        { lat: 41.5912, lon: 1.5209 },
      ],
      costing: 'auto',
      units: 'kilometers',
      directions_type: 'none',
    });
  });

  it('builds a motorcycle route request', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, vehicleCategory: 'motorcycle' },
        'motorcycle',
        config(),
      ),
    ).toMatchObject({
      costing: 'motorcycle',
      costing_options: { motorcycle: { use_unpaved: 0 } },
    });
  });

  it('builds a maxi-scooter request with the motorcycle profile', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, vehicleCategory: 'maxi-scooter' },
        'motorcycle',
        config(),
      ).costing,
    ).toBe('motorcycle');
  });

  it('builds a low-speed-scooter request with conservative options', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, vehicleCategory: 'low-speed-scooter' },
        'motor_scooter',
        config(),
      ),
    ).toMatchObject({
      costing: 'motor_scooter',
      costing_options: {
        motor_scooter: {
          top_speed: 45,
          use_highways: 0,
        },
      },
    });
  });

  it('omits zero alternatives', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, alternatives: 0 },
        'auto',
        config(),
      ),
    ).not.toHaveProperty('alternates');
  });

  it('uses the maximum configured alternatives', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, alternatives: 2 },
        'auto',
        config(),
      ),
    ).toMatchObject({ alternates: 2 });
  });

  it('clamps alternatives to the configured maximum', () => {
    expect(
      buildValhallaRouteRequest(
        { ...baseRequest, alternatives: 3 },
        'auto',
        config(),
      ),
    ).toMatchObject({ alternates: 2 });
  });

  it('builds a trace attributes request', () => {
    expect(
      buildValhallaTraceAttributesRequest('encoded', 'motorcycle'),
    ).toEqual({
      encoded_polyline: 'encoded',
      costing: 'motorcycle',
      shape_match: 'edge_walk',
      filters: {
        action: 'include',
        attributes: traceAttributeFilter,
      },
      costing_options: { motorcycle: { use_unpaved: 0 } },
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
