import type {
  RoutePreferences,
  RoutingProfile,
  VehicleRoutingCategory,
} from '@route-cost/routing';
import { resolveRoutingProfile } from '@route-cost/routing';
import { describe, expect, it } from 'vitest';

import {
  buildValhallaCostingOptions,
  VALHALLA_AVOID_FACTOR,
} from './valhalla-costing-options';

const defaultPreferences: RoutePreferences = {
  avoidTolls: false,
  avoidMotorways: false,
  avoidFerries: false,
  priority: 'fastest',
};

const allAvoidingShortest: RoutePreferences = {
  avoidTolls: true,
  avoidMotorways: true,
  avoidFerries: true,
  priority: 'shortest',
};

describe('buildValhallaCostingOptions', () => {
  it.each(['auto', 'motorcycle', 'motor_scooter'] as const)(
    'maps default preferences for %s',
    (profile) => {
      expect(buildValhallaCostingOptions(profile, defaultPreferences)).toEqual(
        expectedFor(profile, defaultPreferences),
      );
    },
  );

  it.each(['auto', 'motorcycle'] as const)(
    'maps avoid tolls for %s',
    (profile) => {
      const preferences = { ...defaultPreferences, avoidTolls: true };

      expect(buildValhallaCostingOptions(profile, preferences)).toEqual(
        expectedFor(profile, preferences),
      );
      expect(useTolls(buildValhallaCostingOptions(profile, preferences))).toBe(
        VALHALLA_AVOID_FACTOR,
      );
    },
  );

  it('omits unsupported toll willingness for motor_scooter', () => {
    expect(
      buildValhallaCostingOptions('motor_scooter', {
        ...defaultPreferences,
        avoidTolls: true,
      }).motor_scooter,
    ).not.toHaveProperty('use_tolls');
  });

  it.each(['auto', 'motorcycle'] as const)(
    'maps avoid motorways for %s',
    (profile) => {
      const preferences = { ...defaultPreferences, avoidMotorways: true };

      expect(buildValhallaCostingOptions(profile, preferences)).toEqual(
        expectedFor(profile, preferences),
      );
    },
  );

  it('omits unsupported highway willingness for motor_scooter', () => {
    expect(
      buildValhallaCostingOptions('motor_scooter', {
        ...defaultPreferences,
        avoidMotorways: true,
      }).motor_scooter,
    ).not.toHaveProperty('use_highways');
  });

  it.each(['auto', 'motorcycle', 'motor_scooter'] as const)(
    'maps avoid ferries for %s',
    (profile) => {
      const preferences = { ...defaultPreferences, avoidFerries: true };

      expect(buildValhallaCostingOptions(profile, preferences)).toEqual(
        expectedFor(profile, preferences),
      );
      expect(useFerry(buildValhallaCostingOptions(profile, preferences))).toBe(
        VALHALLA_AVOID_FACTOR,
      );
      expect(
        useRailFerry(buildValhallaCostingOptions(profile, preferences)),
      ).toBe(VALHALLA_AVOID_FACTOR);
    },
  );

  it.each(['auto', 'motorcycle', 'motor_scooter'] as const)(
    'maps shortest priority for %s',
    (profile) => {
      const preferences: RoutePreferences = {
        ...defaultPreferences,
        priority: 'shortest',
      };

      expect(buildValhallaCostingOptions(profile, preferences)).toEqual(
        expectedFor(profile, preferences),
      );
    },
  );

  it.each(['auto', 'motorcycle', 'motor_scooter'] as const)(
    'maps all options combined for %s',
    (profile) => {
      expect(buildValhallaCostingOptions(profile, allAvoidingShortest)).toEqual(
        expectedFor(profile, allAvoidingShortest),
      );
    },
  );

  it('uses exact numeric willingness values for every factor', () => {
    expect(
      buildValhallaCostingOptions('auto', defaultPreferences),
    ).toMatchObject({
      auto: {
        use_tolls: 1,
        use_highways: 1,
        use_ferry: 1,
        use_rail_ferry: 1,
        use_distance: 0,
      },
    });
    expect(buildValhallaCostingOptions('auto', allAvoidingShortest)).toEqual({
      auto: {
        use_tolls: 0,
        use_highways: 0,
        use_ferry: 0,
        use_rail_ferry: 0,
        use_distance: 1,
      },
    });
  });

  it('uses the shortest boolean for motorcycle instead of use_distance', () => {
    expect(
      buildValhallaCostingOptions('motorcycle', defaultPreferences),
    ).toEqual({
      motorcycle: {
        use_tolls: 1,
        use_highways: 1,
        use_ferry: 1,
        use_rail_ferry: 1,
        use_unpaved: 0,
        shortest: false,
      },
    });
    expect(
      buildValhallaCostingOptions('motorcycle', allAvoidingShortest),
    ).toEqual({
      motorcycle: {
        use_tolls: 0,
        use_highways: 0,
        use_ferry: 0,
        use_rail_ferry: 0,
        use_unpaved: 0,
        shortest: true,
      },
    });
  });

  it('never emits use_distance for motorcycle or motor_scooter', () => {
    const motorcycleOptions = buildValhallaCostingOptions(
      'motorcycle',
      defaultPreferences,
    );

    expect(motorcycleOptions).not.toHaveProperty('auto');
    expect(
      (motorcycleOptions as Record<string, unknown>).motorcycle,
    ).not.toHaveProperty('use_distance');
    expect(
      buildValhallaCostingOptions('motor_scooter', defaultPreferences),
    ).not.toHaveProperty('auto');
  });

  it('keeps motor_scooter costing limited to supported public-schema options', () => {
    expect(
      buildValhallaCostingOptions('motor_scooter', defaultPreferences),
    ).toEqual({
      motor_scooter: {
        use_ferry: 1,
        use_rail_ferry: 1,
        top_speed: 45,
        shortest: false,
      },
    });
    expect(
      buildValhallaCostingOptions('motor_scooter', {
        ...defaultPreferences,
        avoidTolls: true,
        avoidMotorways: true,
        avoidFerries: true,
      }),
    ).toEqual({
      motor_scooter: {
        use_ferry: 0,
        use_rail_ferry: 0,
        top_speed: 45,
        shortest: false,
      },
    });
  });

  it('does not mutate the input preferences', () => {
    const preferences = { ...defaultPreferences };
    const snapshot = { ...preferences };

    buildValhallaCostingOptions('auto', preferences);

    expect(preferences).toEqual(snapshot);
  });

  it('is deterministic', () => {
    for (const profile of ['auto', 'motorcycle', 'motor_scooter'] as const) {
      expect(buildValhallaCostingOptions(profile, allAvoidingShortest)).toEqual(
        buildValhallaCostingOptions(profile, allAvoidingShortest),
      );
    }
  });

  it('does not leak provider fields into the domain model', () => {
    const options = buildValhallaCostingOptions('auto', defaultPreferences);

    expect(options).not.toHaveProperty('use_tolls');
    expect(options).not.toHaveProperty('use_highways');
    expect(options).not.toHaveProperty('use_ferry');
    expect(options).not.toHaveProperty('use_rail_ferry');
    expect(options).not.toHaveProperty('use_distance');
    expect(options.auto).toMatchObject({
      use_tolls: 1,
      use_highways: 1,
      use_ferry: 1,
      use_rail_ferry: 1,
      use_distance: 0,
    });
  });
});

describe('profile resolution before costing mapping', () => {
  it.each<readonly [VehicleRoutingCategory, RoutingProfile]>([
    ['car', 'auto'],
    ['motorcycle', 'motorcycle'],
    ['maxi-scooter', 'motorcycle'],
    ['low-speed-scooter', 'motor_scooter'],
  ])('resolves %s to %s before mapping', (category, profile) => {
    expect(resolveRoutingProfile(category)).toBe(profile);
  });
});

function expectedFor(
  profile: RoutingProfile,
  preferences: RoutePreferences,
): Record<string, unknown> {
  if (profile === 'auto') {
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

  if (profile === 'motorcycle') {
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

  return {
    motor_scooter: {
      use_ferry: preferences.avoidFerries ? 0 : 1,
      use_rail_ferry: preferences.avoidFerries ? 0 : 1,
      top_speed: 45,
      shortest: preferences.priority === 'shortest',
    },
  };
}

function useTolls(options: ReturnType<typeof buildValhallaCostingOptions>) {
  const profileOptions = Object.values(options)[0] as { use_tolls?: number };

  return profileOptions.use_tolls;
}

function useFerry(options: ReturnType<typeof buildValhallaCostingOptions>) {
  const profileOptions = Object.values(options)[0] as { use_ferry?: number };

  return profileOptions.use_ferry;
}

function useRailFerry(options: ReturnType<typeof buildValhallaCostingOptions>) {
  const profileOptions = Object.values(options)[0] as {
    use_rail_ferry?: number;
  };

  return profileOptions.use_rail_ferry;
}
