import type {
  RouteCharacteristics,
  RouteFeatureDetection,
  RoutePreferences,
} from '@route-cost/contracts';

import { formatDistanceMetres } from '../../../shared/lib/format-distance';
import { formatDurationSeconds } from '../../../shared/lib/format-duration';

export const routeFeatureLabels = {
  tolls: { name: 'Tolls', shortName: 'Tolls' },
  motorways: { name: 'Motorways', shortName: 'Motorways' },
  ferries: { name: 'Ferries', shortName: 'Ferries' },
} as const;

export type RouteFeatureKey = keyof RouteCharacteristics;

export interface RouteFeatureSummaryText {
  readonly label: string;
  readonly distanceText: string | null;
  readonly detection: 'present' | 'absent' | 'unknown';
}

/**
 * Derives the concise textual summary for one observed route characteristic.
 * Text communicates meaning without relying on color.
 */
export function describeRouteFeature(
  feature: RouteFeatureKey,
  detection: RouteFeatureDetection,
): RouteFeatureSummaryText {
  const name = routeFeatureLabels[feature].name;

  if (detection.status === 'unknown') {
    return {
      label: `${name} unknown`,
      distanceText: null,
      detection: 'unknown',
    };
  }

  if (!detection.present) {
    return {
      label: `No ${name.toLowerCase()}`,
      distanceText: null,
      detection: 'absent',
    };
  }

  return {
    label: `Includes ${name.toLowerCase()}`,
    distanceText: formatDistanceMetres(detection.distanceMetres),
    detection: 'present',
  };
}

/**
 * Compact feature tokens used in alternative labels, for example
 * `Tolls · No motorways · No ferries`. Presence is always derived from the
 * observed route, never from the requested preferences.
 */
export function buildAlternativeFeatureSummary(
  characteristics: RouteCharacteristics,
): string {
  return (['tolls', 'motorways', 'ferries'] as const)
    .map((feature) => {
      const detection = characteristics[feature];

      if (detection.status === 'unknown') {
        return `${routeFeatureLabels[feature].shortName} unknown`;
      }

      return detection.present
        ? routeFeatureLabels[feature].shortName
        : `No ${routeFeatureLabels[feature].shortName.toLowerCase()}`;
    })
    .join(' · ');
}

export interface AlternativeLabel {
  readonly title: string;
  readonly detail: string;
}

/**
 * Pure label builder for the alternative selector, for example:
 * `Fastest` / `27 min · 17,5 km · Tolls · No ferries`
 */
export function buildAlternativeLabel(
  index: number,
  priority: RoutePreferences['priority'],
  distanceMetres: number,
  durationSeconds: number,
  characteristics: RouteCharacteristics,
): AlternativeLabel {
  const primaryTitle = priority === 'fastest' ? 'Fastest' : 'Shortest';
  const title = index === 0 ? primaryTitle : `Alternative ${index}`;

  return {
    title,
    detail: [
      formatDurationSeconds(durationSeconds),
      formatDistanceMetres(distanceMetres),
      buildAlternativeFeatureSummary(characteristics),
    ].join(' · '),
  };
}

export function routePreferencesEqual(
  a: RoutePreferences,
  b: RoutePreferences,
): boolean {
  return (
    a.avoidTolls === b.avoidTolls &&
    a.avoidMotorways === b.avoidMotorways &&
    a.avoidFerries === b.avoidFerries &&
    a.priority === b.priority
  );
}

export function conflictWarningText(
  characteristics: RouteCharacteristics,
  conflicts: readonly (
    'tolls-present' | 'motorways-present' | 'ferries-present'
  )[],
): string {
  const messages: string[] = [];

  if (conflicts.includes('tolls-present')) {
    const tolls = describeRouteFeature('tolls', characteristics.tolls);
    messages.push(
      `You asked to avoid toll roads, but this route still includes ${tolls.distanceText ?? 'toll roads'} of toll roads.`,
    );
  }

  if (conflicts.includes('motorways-present')) {
    messages.push(
      'You asked to avoid motorways, but this route still includes motorway sections.',
    );
  }

  if (conflicts.includes('ferries-present')) {
    messages.push(
      'You asked to avoid ferries, but this route still requires a ferry.',
    );
  }

  return messages.join(' ');
}
