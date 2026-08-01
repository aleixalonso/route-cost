import { describe, expect, it } from 'vitest';

import { MockRoutingProvider } from './mock-routing.provider';

describe('MockRoutingProvider', () => {
  it('returns deterministic provider-neutral route data', async () => {
    await expect(
      new MockRoutingProvider().calculateRoutes({
        origin: { latitude: 41.38, longitude: 2.17 },
        destination: { latitude: 41.4, longitude: 2.19 },
        vehicleCategory: 'car',
      }),
    ).resolves.toMatchObject({
      alternatives: [{ id: 'primary', distanceMetres: 17_500 }],
    });
  });

  it('returns deterministic requested alternatives', async () => {
    const result = await new MockRoutingProvider().calculateRoutes({
      origin: { latitude: 41.38, longitude: 2.17 },
      destination: { latitude: 41.4, longitude: 2.19 },
      vehicleCategory: 'car',
      alternatives: 2,
    });

    expect(result.alternatives.map((alternative) => alternative.id)).toEqual([
      'primary',
      'alternative-1',
      'alternative-2',
    ]);
  });

  it('keeps the default fastest route on a tolled motorway with no ferry', async () => {
    const result = await new MockRoutingProvider().calculateRoutes({
      origin: { latitude: 41.38, longitude: 2.17 },
      destination: { latitude: 41.4, longitude: 2.19 },
      vehicleCategory: 'car',
    });

    const primary = result.alternatives[0];
    expect(primary?.segments.map((segment) => segment.roadCategory)).toEqual([
      'urban',
      'interurban',
      'motorway',
    ]);
    expect(primary?.segments[2]).toMatchObject({
      roadCategory: 'motorway',
      isToll: true,
      isFerry: false,
    });
  });

  it('keeps an unavoidable toll on the primary route when avoidTolls is set', async () => {
    const result = await new MockRoutingProvider().calculateRoutes({
      origin: { latitude: 41.38, longitude: 2.17 },
      destination: { latitude: 41.4, longitude: 2.19 },
      vehicleCategory: 'car',
      preferences: {
        avoidTolls: true,
        avoidMotorways: false,
        avoidFerries: false,
        priority: 'fastest',
      },
      alternatives: 1,
    });

    expect(result.alternatives[0]?.segments[2]).toMatchObject({
      roadCategory: 'motorway',
      isToll: true,
    });
    expect(result.alternatives[1]?.segments[2]).toMatchObject({
      roadCategory: 'motorway',
      isToll: false,
    });
  });

  it('drops the motorway when avoidMotorways is set', async () => {
    const result = await new MockRoutingProvider().calculateRoutes({
      origin: { latitude: 41.38, longitude: 2.17 },
      destination: { latitude: 41.4, longitude: 2.19 },
      vehicleCategory: 'car',
      preferences: {
        avoidTolls: false,
        avoidMotorways: true,
        avoidFerries: false,
        priority: 'fastest',
      },
    });

    const primary = result.alternatives[0];
    expect(primary?.segments.map((segment) => segment.roadCategory)).toEqual([
      'urban',
      'interurban',
      'interurban',
    ]);
    expect(primary?.segments.every((segment) => segment.isToll === false)).toBe(
      true,
    );
    expect(primary?.durationSeconds).toBe(1740);
  });

  it('adds an unavoidable ferry when avoidFerries is set', async () => {
    const result = await new MockRoutingProvider().calculateRoutes({
      origin: { latitude: 41.38, longitude: 2.17 },
      destination: { latitude: 41.4, longitude: 2.19 },
      vehicleCategory: 'car',
      preferences: {
        avoidTolls: false,
        avoidMotorways: false,
        avoidFerries: true,
        priority: 'fastest',
      },
    });

    const primary = result.alternatives[0];
    expect(primary?.segments.some((segment) => segment.isFerry === true)).toBe(
      true,
    );
    expect(primary?.distanceMetres).toBe(19_500);
  });

  it('includes a ferry on the ferry alternative regardless of preferences', async () => {
    const result = await new MockRoutingProvider().calculateRoutes({
      origin: { latitude: 41.38, longitude: 2.17 },
      destination: { latitude: 41.4, longitude: 2.19 },
      vehicleCategory: 'car',
      alternatives: 2,
    });

    expect(result.alternatives[2]).toMatchObject({
      id: 'alternative-2',
      distanceMetres: 13_000,
    });
    expect(
      result.alternatives[2]?.segments.some(
        (segment) => segment.isFerry === true,
      ),
    ).toBe(true);
  });
});
