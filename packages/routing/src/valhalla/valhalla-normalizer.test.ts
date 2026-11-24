import { describe, expect, it } from 'vitest';

import routeAlternativesFixture from '../../test/fixtures/valhalla/route-alternatives.json' with { type: 'json' };
import routeNoShapeFixture from '../../test/fixtures/valhalla/route-no-shape.json' with { type: 'json' };
import routePrimaryFixture from '../../test/fixtures/valhalla/route-primary.json' with { type: 'json' };
import traceFerryFixture from '../../test/fixtures/valhalla/trace-ferry.json' with { type: 'json' };
import traceHighDensityMotorwayFixture from '../../test/fixtures/valhalla/trace-high-density-motorway.json' with { type: 'json' };
import traceMissingOptionalFieldsFixture from '../../test/fixtures/valhalla/trace-missing-optional-fields.json' with { type: 'json' };
import traceMixedRouteFixture from '../../test/fixtures/valhalla/trace-mixed-route.json' with { type: 'json' };
import traceMotorwayFixture from '../../test/fixtures/valhalla/trace-motorway.json' with { type: 'json' };
import traceRailFerryFixture from '../../test/fixtures/valhalla/trace-rail-ferry.json' with { type: 'json' };
import { ValhallaInvalidResponseError } from './valhalla.errors.js';
import type {
  ValhallaRouteResponse,
  ValhallaTraceAttributesResponse,
} from './valhalla-config.js';
import {
  getValhallaRouteShapes,
  normalizeValhallaRoutes,
} from './valhalla-normalizer.js';
import { valhallaRouteResponseSchema } from './valhalla-route.schema.js';
import { valhallaTraceAttributesResponseSchema } from './valhalla-trace-attributes.schema.js';

describe('valhalla normalizer', () => {
  it('converts route and segment distances to metres', () => {
    const result = normalizeValhallaRoutes(routePrimary(), [traceMotorway()]);

    expect(result.alternatives[0]).toMatchObject({
      distanceMetres: 10_000,
      segments: [{ distanceMetres: 10_000 }],
    });
  });

  it('preserves durations in seconds', () => {
    expect(
      normalizeValhallaRoutes(routePrimary(), [traceMotorway()]),
    ).toMatchObject({
      alternatives: [{ durationSeconds: 600 }],
    });
  });

  it('assigns deterministic alternative IDs', () => {
    const trace = traceMotorway();
    const result = normalizeValhallaRoutes(routeAlternatives(), [
      trace,
      { edges: [{ ...trace.edges[0]!, length: 11 }] },
      { edges: [{ ...trace.edges[0]!, length: 12 }] },
    ]);

    expect(result.alternatives.map((alternative) => alternative.id)).toEqual([
      'primary',
      'alternative-1',
      'alternative-2',
    ]);
  });

  it('normalizes segment attributes and applies classification', () => {
    const result = normalizeValhallaRoutes(routePrimary(), [traceMixedRoute()]);

    expect(result.alternatives[0]?.segments).toMatchObject([
      {
        distanceMetres: 2_000,
        roadCategory: 'urban',
        classificationReason: 'urban-density',
        expectedSpeedKmh: 30,
        speedLimitKmh: 30,
        roadClass: 'primary',
        roadUse: 'road',
        density: 9,
      },
      {
        distanceMetres: 3_000,
        roadCategory: 'interurban',
        classificationReason: 'interurban-road-class',
      },
      {
        distanceMetres: 5_000,
        roadCategory: 'motorway',
        classificationReason: 'road-class-motorway',
        toll: true,
      },
    ]);
  });

  it('omits missing and null optional fields', () => {
    const segment = normalizeValhallaRoutes(routePrimary(), [
      traceMissingOptionalFields(),
    ]).alternatives[0]?.segments[0];

    expect(segment).toMatchObject({
      roadCategory: 'unknown',
      classificationReason: 'insufficient-data',
    });
    expect(segment).not.toHaveProperty('speedLimitKmh');
    expect(segment).not.toHaveProperty('roadClass');
    expect(segment).not.toHaveProperty('density');
  });

  it('normalizes toll state from the toll attribute', () => {
    expect(
      normalizeValhallaRoutes(routePrimary(), [traceMixedRoute()])
        .alternatives[0]?.segments,
    ).toMatchObject([{ isToll: false }, { isToll: false }, { isToll: true }]);
  });

  it('keeps toll state unknown when the toll attribute is missing', () => {
    expect(
      normalizeValhallaRoutes(routePrimary(), [traceMissingOptionalFields()])
        .alternatives[0]?.segments[0],
    ).toMatchObject({
      isToll: null,
      isFerry: null,
    });
  });

  it('marks ferry use as a ferry segment', () => {
    expect(
      normalizeValhallaRoutes(routePrimary(), [traceFerry()]).alternatives[0]
        ?.segments[0],
    ).toMatchObject({
      isFerry: true,
      isToll: false,
      roadUse: 'ferry',
    });
  });

  it('marks rail-ferry use as a ferry segment', () => {
    expect(
      normalizeValhallaRoutes(routePrimary(), [traceRailFerry()])
        .alternatives[0]?.segments[0],
    ).toMatchObject({
      isFerry: true,
      roadUse: 'rail-ferry',
    });
  });

  it('marks regular road use as not a ferry', () => {
    expect(
      normalizeValhallaRoutes(routePrimary(), [traceMotorway()]).alternatives[0]
        ?.segments[0],
    ).toMatchObject({
      isFerry: false,
      roadUse: 'road',
    });
  });

  it('keeps a high-density motorway classified as motorway', () => {
    expect(
      normalizeValhallaRoutes(routePrimary(), [traceHighDensityMotorway()])
        .alternatives[0]?.segments[0],
    ).toMatchObject({
      roadCategory: 'motorway',
      classificationReason: 'road-class-motorway',
      density: 9,
    });
  });

  it.each([
    ['negative route distance', { trip: { summary: { length: -1 } } }],
    ['negative route duration', { trip: { summary: { time: -1 } } }],
  ])('rejects %s', (_name, patch) => {
    expect(() =>
      normalizeValhallaRoutes(mergeRoute(routePrimary(), patch), [
        traceMotorway(),
      ]),
    ).toThrow(ValhallaInvalidResponseError);
  });

  it('rejects negative segment distance', () => {
    expect(() =>
      normalizeValhallaRoutes(routePrimary(), [
        mergeTrace(traceMotorway(), { edges: [{ length: -1 }] }),
      ]),
    ).toThrow(ValhallaInvalidResponseError);
  });

  it('rejects invalid shape index ranges', () => {
    expect(() =>
      normalizeValhallaRoutes(routePrimary(), [
        mergeTrace(traceMotorway(), {
          edges: [{ begin_shape_index: 4, end_shape_index: 3 }],
        }),
      ]),
    ).toThrow(ValhallaInvalidResponseError);
  });

  it('rejects non-finite values', () => {
    expect(() =>
      normalizeValhallaRoutes(routePrimary(), [
        mergeTrace(traceMotorway(), { edges: [{ speed: Infinity }] }),
      ]),
    ).toThrow(ValhallaInvalidResponseError);
  });

  it('permits a small route-versus-segment distance difference', () => {
    const result = normalizeValhallaRoutes(routePrimary(), [
      mergeTrace(traceMotorway(), { edges: [{ length: 9.8 }] }),
    ]);

    expect(result.alternatives[0]?.segments[0]?.distanceMetres).toBe(9_800);
  });

  it('rejects a large route-versus-segment distance difference', () => {
    expect(() =>
      normalizeValhallaRoutes(routePrimary(), [
        mergeTrace(traceMotorway(), { edges: [{ length: 8 }] }),
      ]),
    ).toThrow(ValhallaInvalidResponseError);
  });

  it('rejects a route response without a shape', () => {
    expect(() => getValhallaRouteShapes(routeNoShape())).toThrow(
      ValhallaInvalidResponseError,
    );
  });
});

function routePrimary(): ValhallaRouteResponse {
  return valhallaRouteResponseSchema.parse(routePrimaryFixture);
}

function routeAlternatives(): ValhallaRouteResponse {
  return valhallaRouteResponseSchema.parse(routeAlternativesFixture);
}

function routeNoShape(): ValhallaRouteResponse {
  return valhallaRouteResponseSchema.parse(routeNoShapeFixture);
}

function traceMotorway(): ValhallaTraceAttributesResponse {
  return valhallaTraceAttributesResponseSchema.parse(traceMotorwayFixture);
}

function traceMixedRoute(): ValhallaTraceAttributesResponse {
  return valhallaTraceAttributesResponseSchema.parse(traceMixedRouteFixture);
}

function traceMissingOptionalFields(): ValhallaTraceAttributesResponse {
  return valhallaTraceAttributesResponseSchema.parse(
    traceMissingOptionalFieldsFixture,
  );
}

function traceFerry(): ValhallaTraceAttributesResponse {
  return valhallaTraceAttributesResponseSchema.parse(traceFerryFixture);
}

function traceRailFerry(): ValhallaTraceAttributesResponse {
  return valhallaTraceAttributesResponseSchema.parse(traceRailFerryFixture);
}

function traceHighDensityMotorway(): ValhallaTraceAttributesResponse {
  return valhallaTraceAttributesResponseSchema.parse(
    traceHighDensityMotorwayFixture,
  );
}

function mergeRoute(
  route: ValhallaRouteResponse,
  patch: Record<string, unknown>,
): ValhallaRouteResponse {
  return {
    ...route,
    trip: {
      ...route.trip,
      ...(patch.trip as Partial<ValhallaRouteResponse['trip']> | undefined),
      summary: {
        ...route.trip.summary,
        ...((patch.trip as { summary?: Record<string, unknown> } | undefined)
          ?.summary ?? {}),
      },
    },
  };
}

function mergeTrace(
  trace: ValhallaTraceAttributesResponse,
  patch: {
    edges: Array<Partial<ValhallaTraceAttributesResponse['edges'][number]>>;
  },
): ValhallaTraceAttributesResponse {
  return {
    edges: trace.edges.map((edge, index) => ({
      ...edge,
      ...patch.edges[index],
    })),
  };
}
