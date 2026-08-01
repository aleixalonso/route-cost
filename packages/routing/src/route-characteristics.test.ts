import { describe, expect, it } from 'vitest';

import type { RouteSegment } from './index.js';
import {
  calculateRouteCharacteristics,
  type RouteCharacteristics,
  type RouteFeatureDetection,
} from './route-characteristics.js';
import { calculateRoutePreferenceCompliance } from './route-compliance.js';
import type { RoutePreferences } from './route-preferences.js';

const defaultPreferences: RoutePreferences = {
  avoidTolls: false,
  avoidMotorways: false,
  avoidFerries: false,
  priority: 'fastest',
};

describe('calculateRouteCharacteristics', () => {
  it('handles an empty segment list with known absence', () => {
    expect(calculateRouteCharacteristics([])).toEqual({
      tolls: known(false, 0, 0),
      motorways: known(false, 0, 0),
      ferries: known(false, 0, 0),
    });
  });

  it('reports absence when no characteristic is present', () => {
    expect(
      calculateRouteCharacteristics([urbanSegment(1_000), urbanSegment(2_000)]),
    ).toEqual({
      tolls: known(false, 0, 0),
      motorways: known(false, 0, 0),
      ferries: known(false, 0, 0),
    });
  });

  it('sums toll distance and counts toll segments', () => {
    const result = calculateRouteCharacteristics([
      segment(1_000, 'urban', false, false),
      segment(4_200, 'interurban', true, false),
      segment(800, 'urban', true, false),
    ]);

    expect(result.tolls).toEqual(known(true, 5_000, 2));
  });

  it('sums motorway distance using the normalized motorway category', () => {
    const result = calculateRouteCharacteristics([
      segment(10_000, 'motorway', false, false),
      segment(3_000, 'interurban', false, false),
      segment(41_800, 'motorway', false, false),
    ]);

    expect(result.motorways).toEqual(known(true, 51_800, 2));
  });

  it('sums ferry distance and counts ferry segments', () => {
    const result = calculateRouteCharacteristics([
      segment(2_000, 'urban', false, true),
      segment(1_000, 'urban', false, false),
    ]);

    expect(result.ferries).toEqual(known(true, 2_000, 1));
  });

  it('counts a segment toward every characteristic it matches', () => {
    const result = calculateRouteCharacteristics([
      segment(5_000, 'motorway', true, true),
    ]);

    expect(result).toEqual({
      tolls: known(true, 5_000, 1),
      motorways: known(true, 5_000, 1),
      ferries: known(true, 5_000, 1),
    });
  });

  it('counts zero-length matching segments without adding distance', () => {
    const result = calculateRouteCharacteristics([
      segment(0, 'motorway', true, false),
    ]);

    expect(result.tolls).toEqual(known(true, 0, 1));
    expect(result.motorways).toEqual(known(true, 0, 1));
  });

  it('never produces negative distances', () => {
    const result = calculateRouteCharacteristics([
      segment(-1_000, 'motorway', true, false),
    ]);

    expect(result.tolls).toEqual(known(true, 0, 1));
    expect(result.motorways).toEqual(known(true, 0, 1));
  });

  it('preserves full numeric precision', () => {
    const result = calculateRouteCharacteristics([
      segment(1_234.567_891, 'urban', true, false),
    ]);

    expect(result.tolls).toEqual(known(true, 1_234.567_891, 1));
  });

  it('reports unknown tolls when any segment lacks the toll attribute', () => {
    const result = calculateRouteCharacteristics([
      { ...urbanSegment(1_000), isToll: null },
    ]);

    expect(result.tolls).toEqual({ status: 'unknown' });
  });

  it('reports known toll presence even when another segment has unknown toll state', () => {
    const result = calculateRouteCharacteristics([
      { ...urbanSegment(1_000), isToll: null },
      segment(4_200, 'interurban', true, false),
    ]);

    expect(result.tolls).toEqual(known(true, 4_200, 1));
  });

  it('reports unknown ferries when any segment lacks the use attribute', () => {
    const result = calculateRouteCharacteristics([
      { ...urbanSegment(1_000), isFerry: null },
    ]);

    expect(result.ferries).toEqual({ status: 'unknown' });
  });

  it('reports known ferry presence even when another segment has unknown ferry state', () => {
    const result = calculateRouteCharacteristics([
      { ...urbanSegment(1_000), isFerry: null },
      segment(2_000, 'interurban', false, true),
    ]);

    expect(result.ferries).toEqual(known(true, 2_000, 1));
  });

  it('keeps other characteristics known when only one is unknown', () => {
    const result = calculateRouteCharacteristics([
      { ...urbanSegment(1_000), isToll: null },
    ]);

    expect(result.motorways).toEqual(known(false, 0, 0));
    expect(result.ferries).toEqual(known(false, 0, 0));
  });

  it('does not mutate the input segments', () => {
    const segments = [segment(1_000, 'urban', false, false)];
    const snapshot = { ...segments[0] };

    calculateRouteCharacteristics(segments);

    expect(segments[0]).toEqual(snapshot);
  });

  it('is deterministic for identical input', () => {
    const segments = [
      segment(5_000, 'motorway', true, false),
      segment(2_000, 'urban', false, false),
    ];

    expect(calculateRouteCharacteristics(segments)).toEqual(
      calculateRouteCharacteristics(segments),
    );
  });
});

describe('calculateRoutePreferenceCompliance', () => {
  it('reports no conflicts when no avoidance preference is set', () => {
    const characteristics = characteristicsWith('known', true, true, true);

    expect(
      calculateRoutePreferenceCompliance(defaultPreferences, characteristics),
    ).toEqual({ conflicts: [] });
  });

  it('reports no conflict when avoiding tolls and no tolls are present', () => {
    expect(
      calculateRoutePreferenceCompliance(
        { ...defaultPreferences, avoidTolls: true },
        characteristicsWith('known', false, true, false),
      ),
    ).toEqual({ conflicts: [] });
  });

  it('reports tolls-present when avoiding tolls and tolls are present', () => {
    expect(
      calculateRoutePreferenceCompliance(
        { ...defaultPreferences, avoidTolls: true },
        characteristicsWith('known', true, false, false),
      ),
    ).toEqual({ conflicts: ['tolls-present'] });
  });

  it('reports no conflict when avoiding motorways and none are present', () => {
    expect(
      calculateRoutePreferenceCompliance(
        { ...defaultPreferences, avoidMotorways: true },
        characteristicsWith('known', false, false, false),
      ),
    ).toEqual({ conflicts: [] });
  });

  it('reports motorways-present when avoiding motorways and they are present', () => {
    expect(
      calculateRoutePreferenceCompliance(
        { ...defaultPreferences, avoidMotorways: true },
        characteristicsWith('known', false, true, false),
      ),
    ).toEqual({ conflicts: ['motorways-present'] });
  });

  it('reports no conflict when avoiding ferries and none are present', () => {
    expect(
      calculateRoutePreferenceCompliance(
        { ...defaultPreferences, avoidFerries: true },
        characteristicsWith('known', false, false, false),
      ),
    ).toEqual({ conflicts: [] });
  });

  it('reports ferries-present when avoiding ferries and one is present', () => {
    expect(
      calculateRoutePreferenceCompliance(
        { ...defaultPreferences, avoidFerries: true },
        characteristicsWith('known', false, false, true),
      ),
    ).toEqual({ conflicts: ['ferries-present'] });
  });

  it('reports multiple simultaneous conflicts in stable order', () => {
    expect(
      calculateRoutePreferenceCompliance(
        {
          avoidTolls: true,
          avoidMotorways: true,
          avoidFerries: true,
          priority: 'fastest',
        },
        characteristicsWith('known', true, true, true),
      ),
    ).toEqual({
      conflicts: ['tolls-present', 'motorways-present', 'ferries-present'],
    });
  });

  it('never derives a conflict from priority', () => {
    const characteristics = characteristicsWith('known', true, true, true);

    expect(
      calculateRoutePreferenceCompliance(
        { ...defaultPreferences, priority: 'shortest' },
        characteristics,
      ),
    ).toEqual({ conflicts: [] });
  });

  it('does not report a conflict for unknown detection', () => {
    expect(
      calculateRoutePreferenceCompliance(
        {
          avoidTolls: true,
          avoidMotorways: true,
          avoidFerries: true,
          priority: 'fastest',
        },
        characteristicsWith('unknown'),
      ),
    ).toEqual({ conflicts: [] });
  });

  it('does not mutate inputs', () => {
    const characteristics = characteristicsWith('known', true, false, false);
    const snapshot = {
      ...characteristics,
      tolls: { ...characteristics.tolls },
    };
    const preferences: RoutePreferences = {
      ...defaultPreferences,
      avoidTolls: true,
    };

    calculateRoutePreferenceCompliance(preferences, characteristics);

    expect(characteristics).toEqual(snapshot);
    expect(preferences).toEqual({ ...defaultPreferences, avoidTolls: true });
  });
});

function segment(
  distanceMetres: number,
  roadCategory: RouteSegment['roadCategory'],
  isToll: boolean,
  isFerry: boolean,
): RouteSegment {
  return {
    distanceMetres,
    beginShapeIndex: 0,
    endShapeIndex: 1,
    roadCategory,
    classificationReason: 'urban-density',
    isToll,
    isFerry,
  };
}

function urbanSegment(distanceMetres: number): RouteSegment {
  return segment(distanceMetres, 'urban', false, false);
}

function known(
  present: boolean,
  distanceMetres: number,
  segmentCount: number,
): RouteFeatureDetection {
  return { status: 'known', present, distanceMetres, segmentCount };
}

function characteristicsWith(
  status: 'known' | 'unknown',
  tollsPresent?: boolean,
  motorwaysPresent?: boolean,
  ferriesPresent?: boolean,
): RouteCharacteristics {
  if (status === 'unknown') {
    return {
      tolls: { status: 'unknown' },
      motorways: { status: 'unknown' },
      ferries: { status: 'unknown' },
    };
  }

  return {
    tolls: known(tollsPresent ?? false, 0, 0),
    motorways: known(motorwaysPresent ?? false, 0, 0),
    ferries: known(ferriesPresent ?? false, 0, 0),
  };
}
