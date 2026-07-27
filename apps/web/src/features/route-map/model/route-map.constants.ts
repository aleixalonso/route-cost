export const ROAD_CATEGORIES = [
  'urban',
  'interurban',
  'motorway',
  'unknown',
] as const;

export type RoadCategory = (typeof ROAD_CATEGORIES)[number];

export const ROAD_CATEGORY_STYLE: Record<
  RoadCategory,
  { readonly label: string; readonly lineColor: string }
> = {
  urban: { label: 'Urban', lineColor: '#0072b2' },
  interurban: { label: 'Interurban', lineColor: '#009e73' },
  motorway: { label: 'Motorway', lineColor: '#d55e00' },
  unknown: { label: 'Unknown', lineColor: '#6b7280' },
} as const;

export const ROUTE_MAP_SOURCE_IDS = {
  fullRoute: 'route-full-source',
  segments: 'route-segments-source',
} as const;

export const ROUTE_MAP_LAYER_IDS = {
  casing: 'route-casing-layer',
  fullRoute: 'route-full-layer',
  segments: 'route-segments-layer',
} as const;

export const ROUTE_MAP_PADDING = {
  mobile: { top: 32, right: 24, bottom: 72, left: 24 },
  desktop: { top: 48, right: 48, bottom: 96, left: 48 },
} as const;

export const DEFAULT_MAP_STYLE_URL = '/map-style.json';
