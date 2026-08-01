import type {
  RouteCharacteristics,
  RoutePreferences,
} from '@route-cost/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildAlternativeFeatureSummary,
  buildAlternativeLabel,
  conflictWarningText,
  describeRouteFeature,
  routePreferencesEqual,
} from './route-characteristics';

function known(present: boolean, distanceMetres: number, segmentCount: number) {
  return { status: 'known' as const, present, distanceMetres, segmentCount };
}

function characteristics(
  overrides: Partial<RouteCharacteristics> = {},
): RouteCharacteristics {
  return {
    tolls: known(false, 0, 0),
    motorways: known(false, 0, 0),
    ferries: known(false, 0, 0),
    ...overrides,
  };
}

describe('describeRouteFeature', () => {
  it('describes present tolls with a localized distance', () => {
    expect(describeRouteFeature('tolls', known(true, 4_200, 2))).toEqual({
      label: 'Includes tolls',
      distanceText: '4,2 km',
      detection: 'present',
    });
  });

  it('describes absence without a distance', () => {
    expect(describeRouteFeature('ferries', known(false, 0, 0))).toEqual({
      label: 'No ferries',
      distanceText: null,
      detection: 'absent',
    });
  });

  it('describes unknown detection without claiming absence', () => {
    expect(describeRouteFeature('tolls', { status: 'unknown' })).toEqual({
      label: 'Tolls unknown',
      distanceText: null,
      detection: 'unknown',
    });
  });
});

describe('buildAlternativeFeatureSummary', () => {
  it('uses observed data, not requested preferences', () => {
    expect(
      buildAlternativeFeatureSummary(
        characteristics({
          tolls: known(true, 4_200, 1),
          motorways: known(true, 51_800, 6),
          ferries: known(false, 0, 0),
        }),
      ),
    ).toBe('Tolls · Motorways · No ferries');
  });

  it('handles all-absent and unknown states', () => {
    expect(buildAlternativeFeatureSummary(characteristics())).toBe(
      'No tolls · No motorways · No ferries',
    );
    expect(
      buildAlternativeFeatureSummary(
        characteristics({ tolls: { status: 'unknown' } }),
      ),
    ).toBe('Tolls unknown · No motorways · No ferries');
  });
});

describe('buildAlternativeLabel', () => {
  it('builds a primary label with observed features', () => {
    expect(
      buildAlternativeLabel(
        0,
        'fastest',
        61_800,
        3240,
        characteristics({ tolls: known(true, 4_200, 1) }),
      ),
    ).toEqual({
      title: 'Fastest',
      detail: '54 min · 61,8 km · Tolls · No motorways · No ferries',
    });
  });

  it('uses the applied priority for the primary route label', () => {
    expect(
      buildAlternativeLabel(0, 'shortest', 61_800, 3240, characteristics()),
    ).toEqual({
      title: 'Shortest',
      detail: '54 min · 61,8 km · No tolls · No motorways · No ferries',
    });
  });

  it('builds a numbered alternative label', () => {
    expect(
      buildAlternativeLabel(
        2,
        'fastest',
        72_400,
        3840,
        characteristics({ motorways: known(true, 51_800, 6) }),
      ),
    ).toEqual({
      title: 'Alternative 2',
      detail: '1 h 4 min · 72,4 km · No tolls · Motorways · No ferries',
    });
  });
});

describe('routePreferencesEqual', () => {
  it('compares all four values', () => {
    const a: RoutePreferences = {
      avoidTolls: false,
      avoidMotorways: false,
      avoidFerries: false,
      priority: 'fastest',
    };

    expect(routePreferencesEqual(a, { ...a })).toBe(true);
    expect(routePreferencesEqual(a, { ...a, avoidTolls: true })).toBe(false);
    expect(routePreferencesEqual(a, { ...a, avoidMotorways: true })).toBe(
      false,
    );
    expect(routePreferencesEqual(a, { ...a, avoidFerries: true })).toBe(false);
    expect(routePreferencesEqual(a, { ...a, priority: 'shortest' })).toBe(
      false,
    );
  });
});

describe('conflictWarningText', () => {
  it('only mentions conflicts that are actually listed', () => {
    expect(
      conflictWarningText(characteristics({ tolls: known(true, 4_200, 1) }), [
        'tolls-present',
      ]),
    ).toBe(
      'You asked to avoid toll roads, but this route still includes 4,2 km of toll roads.',
    );
  });

  it('groups multiple conflicts into one text', () => {
    expect(
      conflictWarningText(
        characteristics({
          tolls: known(true, 4_200, 1),
          motorways: known(true, 51_800, 6),
        }),
        ['tolls-present', 'motorways-present'],
      ),
    ).toBe(
      'You asked to avoid toll roads, but this route still includes 4,2 km of toll roads. You asked to avoid motorways, but this route still includes motorway sections.',
    );
  });

  it('ignores present features that are not listed as conflicts', () => {
    expect(
      conflictWarningText(
        characteristics({ tolls: known(true, 4_200, 1) }),
        [],
      ),
    ).toBe('');
  });
});
