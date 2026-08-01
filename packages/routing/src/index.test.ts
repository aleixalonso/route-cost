import { describe, expect, it } from 'vitest';

import type {
  RouteSegment,
  RoutingProvider,
  VehicleRoutingCategory,
} from './index.js';
import {
  classifyRouteSegment,
  resolveRoutingProfile,
  RoutingProviderAuthenticationError,
  RoutingProviderInvalidResponseError,
  RoutingProviderRateLimitError,
  RoutingProviderRouteNotFoundError,
  RoutingProviderTimeoutError,
  RoutingProviderUnavailableError,
  summarizeRouteDistances,
} from './index.js';

describe('RoutingProvider', () => {
  it('allows provider-neutral route calculation implementations', async () => {
    const provider: RoutingProvider = {
      async calculateRoutes() {
        return {
          alternatives: [
            {
              id: 'route-a',
              distanceMetres: 1_000,
              durationSeconds: 60,
              encodedPolyline: 'encoded',
              segments: [
                {
                  distanceMetres: 1_000,
                  beginShapeIndex: 0,
                  endShapeIndex: 1,
                  roadCategory: 'unknown',
                  classificationReason: 'insufficient-data',
                  isToll: false,
                  isFerry: false,
                },
              ],
            },
          ],
        };
      },
    };

    await expect(
      provider.calculateRoutes({
        origin: { latitude: 0, longitude: 0 },
        destination: { latitude: 1, longitude: 1 },
        vehicleCategory: 'car',
      }),
    ).resolves.toMatchObject({ alternatives: [{ id: 'route-a' }] });
  });
});

describe('resolveRoutingProfile', () => {
  it.each<
    readonly [VehicleRoutingCategory, ReturnType<typeof resolveRoutingProfile>]
  >([
    ['car', 'auto'],
    ['motorcycle', 'motorcycle'],
    ['maxi-scooter', 'motorcycle'],
    ['low-speed-scooter', 'motor_scooter'],
  ])('maps %s to %s', (vehicleCategory, profile) => {
    expect(resolveRoutingProfile(vehicleCategory)).toBe(profile);
  });

  it('keeps exhaustive handling visible at runtime for invalid casts', () => {
    expect(resolveRoutingProfile('invalid' as VehicleRoutingCategory)).toBe(
      'invalid',
    );
  });
});

describe('classifyRouteSegment', () => {
  it.each([
    [
      'motorway',
      { roadClass: 'motorway', density: 2 },
      'motorway',
      'road-class-motorway',
    ],
    [
      'trunk road',
      { roadClass: 'trunk', density: 2 },
      'motorway',
      'road-class-motorway',
    ],
    [
      'motorway in a high-density area',
      { roadClass: 'motorway', density: 9 },
      'motorway',
      'road-class-motorway',
    ],
    [
      'urban primary road',
      { roadClass: 'primary', density: 9 },
      'urban',
      'urban-density',
    ],
    [
      'rural primary road',
      { roadClass: 'primary', density: 2 },
      'interurban',
      'interurban-road-class',
    ],
    [
      'secondary road',
      { roadClass: 'secondary', density: 2 },
      'interurban',
      'interurban-road-class',
    ],
    [
      'tertiary road',
      { roadClass: 'tertiary', density: 2 },
      'interurban',
      'interurban-road-class',
    ],
    [
      'residential road without density',
      { roadClass: 'residential' },
      'urban',
      'urban-road-class',
    ],
    [
      'service road',
      { roadClass: 'service_other' },
      'urban',
      'urban-road-class',
    ],
    [
      'unknown road class',
      { roadClass: 'living_street', density: 2 },
      'unknown',
      'insufficient-data',
    ],
    ['missing road class', { density: 2 }, 'unknown', 'insufficient-data'],
    [
      'missing density',
      { roadClass: 'primary' },
      'interurban',
      'interurban-road-class',
    ],
    [
      'density exactly equal to 8',
      { roadClass: 'living_street', density: 8 },
      'unknown',
      'insufficient-data',
    ],
    ['density equal to 9', { density: 9 }, 'urban', 'urban-density'],
  ] as const)(
    'classifies %s',
    (_name, attributes, roadCategory, classificationReason) => {
      expect(classifyRouteSegment(attributes)).toEqual({
        roadCategory,
        classificationReason,
      });
    },
  );
});

describe('summarizeRouteDistances', () => {
  it('sums every segment exactly once by category', () => {
    const segments = [
      segment('urban', 10),
      segment('interurban', 20),
      segment('motorway', 30),
      segment('unknown', 40),
      segment('urban', 5),
    ];

    expect(summarizeRouteDistances(segments)).toEqual({
      urbanDistanceMetres: 15,
      interurbanDistanceMetres: 20,
      motorwayDistanceMetres: 30,
      unknownDistanceMetres: 40,
    });
  });

  it('returns zero for missing categories', () => {
    expect(summarizeRouteDistances([segment('unknown', 12)])).toEqual({
      urbanDistanceMetres: 0,
      interurbanDistanceMetres: 0,
      motorwayDistanceMetres: 0,
      unknownDistanceMetres: 12,
    });
  });

  it('keeps exhaustive handling visible at runtime for invalid casts', () => {
    expect(
      summarizeRouteDistances([
        segment('not-a-category' as RouteSegment['roadCategory'], 12),
      ]),
    ).toBe('not-a-category');
  });
});

describe('routing provider errors', () => {
  it.each([
    [
      RoutingProviderAuthenticationError,
      'RoutingProviderAuthenticationError',
      'Routing provider authentication failed.',
    ],
    [
      RoutingProviderRateLimitError,
      'RoutingProviderRateLimitError',
      'Routing provider rate limit exceeded.',
    ],
    [
      RoutingProviderUnavailableError,
      'RoutingProviderUnavailableError',
      'Routing provider is unavailable.',
    ],
    [
      RoutingProviderInvalidResponseError,
      'RoutingProviderInvalidResponseError',
      'Routing provider returned an invalid response.',
    ],
    [
      RoutingProviderRouteNotFoundError,
      'RoutingProviderRouteNotFoundError',
      'No route was found.',
    ],
  ])('creates %s with sanitized metadata', (ErrorClass, name, message) => {
    const error = new ErrorClass(message, {
      status: 503,
      providerRequestId: 'request-id',
      providerErrorCode: 'provider-code',
    });

    expect(error.name).toBe(name);
    expect(error.message).toBe(message);
    expect(error).toMatchObject({
      status: 503,
      providerRequestId: 'request-id',
      providerErrorCode: 'provider-code',
    });
  });

  it('creates timeout errors without HTTP status metadata', () => {
    const error = new RoutingProviderTimeoutError(
      'Routing provider request timed out.',
      {
        providerRequestId: 'request-id',
        providerErrorCode: 'provider-code',
      },
    );

    expect(error.name).toBe('RoutingProviderTimeoutError');
    expect(error.message).toBe('Routing provider request timed out.');
    expect(error).toMatchObject({
      providerRequestId: 'request-id',
      providerErrorCode: 'provider-code',
    });
    expect('status' in error).toBe(false);
  });
});

function segment(
  roadCategory: RouteSegment['roadCategory'],
  distanceMetres: number,
): RouteSegment {
  return {
    distanceMetres,
    beginShapeIndex: 0,
    endShapeIndex: 1,
    roadCategory,
    classificationReason:
      roadCategory === 'unknown'
        ? 'insufficient-data'
        : 'interurban-road-class',
    isToll: false,
    isFerry: false,
  };
}
