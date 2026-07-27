import type { EstimateRouteCostResponse } from '@route-cost/contracts';
import { describe, expect, it } from 'vitest';

import type { SelectedLocation } from '../../location-search';
import { buildRouteLineFeature } from './build-route-geojson';
import { buildRouteMapModel } from './build-route-map-model';
import { buildRouteSegmentFeatures } from './build-segment-geojson';
import { calculateRouteBounds } from './calculate-route-bounds';
import { decodeRouteGeometry } from './decode-route-geometry';
import { sliceRouteSegments } from './slice-route-segments';

const VALHALLA_DOCS_SHORT_ROUTE = 'e~epoA|jfpOiDaK';
const BARCELONA_ROUTE = 'o~`}mA_hmcC_sN_|BoxO_uC';

const origin = {
  id: 'origin',
  label: 'Plaça de Catalunya',
  coordinate: { latitude: 41.387, longitude: 2.17 },
} satisfies SelectedLocation;

const destination = {
  id: 'destination',
  label: 'Sagrada Família',
  coordinate: { latitude: 41.4036, longitude: 2.1744 },
} satisfies SelectedLocation;

describe('decodeRouteGeometry', () => {
  it('rejects empty geometry', () => {
    expect(() => decodeRouteGeometry('')).toThrow('empty');
  });

  it('decodes a verified Valhalla polyline6 short route', () => {
    expect(decodeRouteGeometry(VALHALLA_DOCS_SHORT_ROUTE)).toEqual([
      { latitude: 42.225139, longitude: -8.670911 },
      { latitude: 42.225224, longitude: -8.670718 },
    ]);
  });

  it('decodes a multi-point route with configured precision', () => {
    expect(decodeRouteGeometry(BARCELONA_ROUTE)).toEqual([
      { latitude: 41.387, longitude: 2.17 },
      { latitude: 41.395, longitude: 2.172 },
      { latitude: 41.4036, longitude: 2.1744 },
    ]);
  });

  it('supports negative latitude and longitude deltas', () => {
    expect(decodeRouteGeometry('o~`}mA_hmcCnzDn}@')).toEqual([
      { latitude: 41.387, longitude: 2.17 },
      { latitude: 41.384, longitude: 2.169 },
    ]);
  });

  it('supports large coordinate deltas', () => {
    expect(decodeRouteGeometry('??_gdtjD_oiivI')).toEqual([
      { latitude: 0, longitude: 0 },
      { latitude: 90, longitude: 180 },
    ]);
  });

  it('rejects malformed, truncated, and out-of-range geometry', () => {
    expect(() => decodeRouteGeometry('e~epoA|jfpOiD')).toThrow('truncated');
    expect(() => decodeRouteGeometry(String.fromCharCode(10))).toThrow(
      'invalid character',
    );
    expect(() => decodeRouteGeometry('??_keqlD?')).toThrow(
      'Invalid route coordinate',
    );
    expect(() => decodeRouteGeometry('???_sjfxI')).toThrow(
      'Invalid route coordinate',
    );
  });

  it('is deterministic and does not mutate input', () => {
    const encoded = BARCELONA_ROUTE;

    expect(decodeRouteGeometry(encoded)).toEqual(decodeRouteGeometry(encoded));
    expect(encoded).toBe(BARCELONA_ROUTE);
  });
});

describe('sliceRouteSegments', () => {
  const coordinates = decodeRouteGeometry(BARCELONA_ROUTE);

  it('slices one segment with inclusive indexes', () => {
    expect(
      sliceRouteSegments(coordinates, [
        { beginShapeIndex: 0, endShapeIndex: 1, roadCategory: 'urban' },
      ]),
    ).toEqual([
      {
        coordinates: coordinates.slice(0, 2),
        segmentIndex: 0,
        roadCategory: 'urban',
      },
    ]);
  });

  it('preserves adjacent order and shared boundary points', () => {
    const segments = sliceRouteSegments(coordinates, [
      { beginShapeIndex: 0, endShapeIndex: 1, roadCategory: 'urban' },
      { beginShapeIndex: 1, endShapeIndex: 2, roadCategory: 'motorway' },
    ]);

    expect(segments.map((segment) => segment.roadCategory)).toEqual([
      'urban',
      'motorway',
    ]);
    expect(segments[0]?.coordinates.at(-1)).toEqual(
      segments[1]?.coordinates[0],
    );
  });

  it('excludes invalid, one-point, zero-length, and missing segments', () => {
    expect(
      sliceRouteSegments(coordinates, [
        { beginShapeIndex: -1, endShapeIndex: 1, roadCategory: 'urban' },
        { beginShapeIndex: 2, endShapeIndex: 1, roadCategory: 'urban' },
        { beginShapeIndex: 5, endShapeIndex: 6, roadCategory: 'urban' },
        { beginShapeIndex: 1, endShapeIndex: 1, roadCategory: 'unknown' },
      ]),
    ).toEqual([]);
    expect(sliceRouteSegments(coordinates, undefined)).toEqual([]);
    expect(
      sliceRouteSegments(
        [
          { latitude: 1, longitude: 1 },
          { latitude: 1, longitude: 1 },
        ],
        [{ beginShapeIndex: 0, endShapeIndex: 1, roadCategory: 'unknown' }],
      ),
    ).toEqual([]);
  });

  it('does not mutate input arrays', () => {
    const segments = [
      { beginShapeIndex: 0, endShapeIndex: 1, roadCategory: 'interurban' },
    ] as const;
    const before = JSON.stringify({ coordinates, segments });

    sliceRouteSegments(coordinates, segments);

    expect(JSON.stringify({ coordinates, segments })).toBe(before);
  });
});

describe('GeoJSON and bounds utilities', () => {
  it('builds full route GeoJSON with longitude-latitude coordinate order', () => {
    expect(
      buildRouteLineFeature([{ latitude: 41.387, longitude: 2.17 }]),
    ).toEqual({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[2.17, 41.387]] },
      properties: {},
    });
  });

  it('builds minimal segment FeatureCollection properties', () => {
    const coordinates = decodeRouteGeometry(BARCELONA_ROUTE);

    expect(
      buildRouteSegmentFeatures(coordinates, [
        { beginShapeIndex: 0, endShapeIndex: 1, roadCategory: 'unknown' },
      ]).features[0],
    ).toEqual({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.17, 41.387],
          [2.172, 41.395],
        ],
      },
      properties: { roadCategory: 'unknown', segmentIndex: 0 },
    });
  });

  it('calculates finite bounds for normal, reversed, one-point, and repeated routes', () => {
    expect(
      calculateRouteBounds([
        { latitude: -10, longitude: -20 },
        { latitude: 5, longitude: 3 },
      ]),
    ).toEqual({ west: -20, south: -10, east: 3, north: 5 });
    expect(
      calculateRouteBounds([
        { latitude: 5, longitude: 3 },
        { latitude: -10, longitude: -20 },
      ]),
    ).toEqual({ west: -20, south: -10, east: 3, north: 5 });
    expect(calculateRouteBounds([{ latitude: 1, longitude: 2 }])).toEqual({
      west: 2,
      south: 1,
      east: 2,
      north: 1,
    });
    expect(
      calculateRouteBounds([
        { latitude: 1, longitude: 2 },
        { latitude: 1, longitude: 2 },
      ]),
    ).toEqual({ west: 2, south: 1, east: 2, north: 1 });
  });

  it('rejects empty or invalid bounds input and does not mutate input', () => {
    const coordinates = [{ latitude: 1, longitude: 2 }] as const;

    expect(() => calculateRouteBounds([])).toThrow('at least one');
    expect(() =>
      calculateRouteBounds([{ latitude: Number.NaN, longitude: 2 }]),
    ).toThrow('Invalid route coordinate');
    calculateRouteBounds(coordinates);
    expect(coordinates).toEqual([{ latitude: 1, longitude: 2 }]);
  });
});

describe('buildRouteMapModel', () => {
  it('builds the selected route model without backend calculations', () => {
    const alternative = buildAlternative();
    const model = buildRouteMapModel(alternative, origin, destination);

    expect(model.alternativeId).toBe('primary');
    expect(model.origin).toEqual(origin.coordinate);
    expect(model.destination).toEqual(destination.coordinate);
    expect(model.fullRoute.geometry.coordinates).toHaveLength(3);
    expect(model.segments.features).toHaveLength(1);
    expect(model.bounds).toEqual({
      west: 2.17,
      south: 41.387,
      east: 2.1744,
      north: 41.4036,
    });
    expect([...model.representedCategories]).toEqual(['urban', 'unknown']);
    expect(alternative.distanceMetres).toBe(17_500);
  });

  it('keeps full route when segment metadata is missing or partially invalid', () => {
    const model = buildRouteMapModel(
      {
        ...buildAlternative(),
        segments: [
          {
            distanceMetres: 1,
            beginShapeIndex: 0,
            endShapeIndex: 9,
            roadCategory: 'urban',
            classificationReason: 'urban-density',
          },
          {
            distanceMetres: 1,
            beginShapeIndex: 1,
            endShapeIndex: 2,
            roadCategory: 'motorway',
            classificationReason: 'road-class-motorway',
          },
        ],
      },
      origin,
      destination,
    );

    expect(model.fullRoute.geometry.coordinates).toHaveLength(3);
    expect(model.segments.features).toHaveLength(1);
    expect(model.segments.features[0]?.properties.roadCategory).toBe(
      'motorway',
    );
  });

  it('fails safely for invalid full geometry and does not mutate inputs', () => {
    const alternative = { ...buildAlternative(), encodedPolyline: 'bad' };
    const before = JSON.stringify({ alternative, origin, destination });

    expect(() =>
      buildRouteMapModel(alternative, origin, destination),
    ).toThrow();
    expect(JSON.stringify({ alternative, origin, destination })).toBe(before);
  });
});

function buildAlternative(): EstimateRouteCostResponse['alternatives'][number] {
  return {
    id: 'primary',
    distanceMetres: 17_500,
    durationSeconds: 1620,
    encodedPolyline: BARCELONA_ROUTE,
    summary: {
      urbanDistanceMetres: 7500,
      interurbanDistanceMetres: 0,
      motorwayDistanceMetres: 0,
      unknownDistanceMetres: 10_000,
    },
    segments: [
      {
        distanceMetres: 7500,
        beginShapeIndex: 0,
        endShapeIndex: 1,
        roadCategory: 'urban',
        classificationReason: 'urban-density',
      },
      {
        distanceMetres: 10_000,
        beginShapeIndex: 2,
        endShapeIndex: 2,
        roadCategory: 'unknown',
        classificationReason: 'insufficient-data',
      },
    ],
    fuelEstimate: {
      breakdown: {
        urban: {
          distanceMetres: 7500,
          litresPer100Km: 3.8,
          estimatedLitres: 0.285,
        },
        interurban: {
          distanceMetres: 0,
          litresPer100Km: 3,
          estimatedLitres: 0,
        },
        motorway: {
          distanceMetres: 0,
          litresPer100Km: 4.1,
          estimatedLitres: 0,
        },
        unknown: {
          distanceMetres: 10_000,
          litresPer100Km: 3.4,
          estimatedLitres: 0.34,
        },
      },
      totalLitres: 0.625,
    },
    costEstimate: {
      fuelPrice: { amountPerLitre: 1.6, currency: 'EUR' },
      estimatedCost: 1,
    },
  };
}
