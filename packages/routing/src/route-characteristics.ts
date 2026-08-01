import type { RouteSegment } from './index.js';

export type RouteFeatureDetection =
  | {
      readonly status: 'known';
      readonly present: boolean;
      readonly distanceMetres: number;
      readonly segmentCount: number;
    }
  | {
      readonly status: 'unknown';
    };

export interface RouteCharacteristics {
  readonly tolls: RouteFeatureDetection;
  readonly motorways: RouteFeatureDetection;
  readonly ferries: RouteFeatureDetection;
}

type SegmentFeatureState = boolean | null | undefined;

/**
 * Aggregates normalized route segments into observed route characteristics.
 *
 * A segment can contribute to several characteristics at once (for example a
 * tolled motorway contributes to both tolls and motorways).
 *
 * Known presence wins over missing data: an explicit matching segment is enough
 * to report the feature as present. If no matching segment is known and any
 * segment's feature state is unknown, the characteristic is reported as
 * `unknown` because absence cannot be ruled out.
 */
export function calculateRouteCharacteristics(
  segments: readonly RouteSegment[],
): RouteCharacteristics {
  return {
    tolls: aggregateFeature(segments, (segment) => segment.isToll),
    motorways: aggregateFeature(
      segments,
      (segment) => segment.roadCategory === 'motorway',
    ),
    ferries: aggregateFeature(segments, (segment) => segment.isFerry),
  };
}

function aggregateFeature(
  segments: readonly RouteSegment[],
  stateOf: (segment: RouteSegment) => SegmentFeatureState,
): RouteFeatureDetection {
  let present = false;
  let distanceMetres = 0;
  let segmentCount = 0;
  let hasUnknown = false;

  for (const segment of segments) {
    const state = stateOf(segment);

    if (state === null || state === undefined) {
      hasUnknown = true;
      continue;
    }

    if (state) {
      present = true;
      segmentCount += 1;
      distanceMetres +=
        Number.isFinite(segment.distanceMetres) && segment.distanceMetres > 0
          ? segment.distanceMetres
          : 0;
    }
  }

  if (!present && hasUnknown) {
    return { status: 'unknown' };
  }

  return {
    status: 'known',
    present,
    distanceMetres,
    segmentCount,
  };
}
