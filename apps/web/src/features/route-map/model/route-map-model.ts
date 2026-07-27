import type { EstimateRouteCostResponse } from '@route-cost/contracts';

import type {
  LineStringFeature,
  LineStringFeatureCollection,
} from '../lib/geojson';
import type { RoadCategory } from './route-map.constants';

export type RouteCostAlternative =
  EstimateRouteCostResponse['alternatives'][number];

export interface RouteCoordinate {
  readonly latitude: number;
  readonly longitude: number;
}

export interface RouteBounds {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}

export interface RouteSegmentProperties {
  readonly roadCategory: RoadCategory;
  readonly segmentIndex: number;
}

export interface RouteMapModel {
  readonly alternativeId: string;
  readonly fullRoute: LineStringFeature;
  readonly segments: LineStringFeatureCollection<RouteSegmentProperties>;
  readonly bounds: RouteBounds;
  readonly coordinates: readonly RouteCoordinate[];
  readonly origin: RouteCoordinate;
  readonly destination: RouteCoordinate;
  readonly representedCategories: ReadonlySet<RoadCategory>;
}

export type RouteMapSegment = Pick<
  RouteCostAlternative['segments'][number],
  'beginShapeIndex' | 'endShapeIndex' | 'roadCategory'
>;
