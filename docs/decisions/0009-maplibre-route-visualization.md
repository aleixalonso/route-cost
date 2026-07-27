# 0009 MapLibre Route Visualization

## Status

Accepted.

## Decision

The web app uses MapLibre GL JS directly for route visualization. No React map wrapper, map component framework, GeoJSON toolkit, Turf.js, component library, or provider-specific frontend SDK is introduced.

The backend remains the source of truth for routing, alternatives, road-category classification, distance, duration, fuel use, and cost. The frontend only decodes Valhalla polyline6 route geometry, slices decoded shape points by backend `beginShapeIndex` and `endShapeIndex`, converts route coordinates to GeoJSON, and applies visual styles from backend road categories.

Only the selected route alternative is rendered. Alternative selection remains in the existing native radio controls outside the map. Origin and destination markers are non-draggable DOM markers labelled `A` and `B`.

The map renders a full-route fallback line beneath categorized segment lines:

```text
base route casing
full route fallback
categorized road segments
```

This keeps the complete route visible when segment metadata is incomplete, invalid, or unknown.

## Configuration

The map style is frontend runtime configuration through:

```dotenv
VITE_MAP_STYLE_URL=/map-style.json
```

The default local style is a deterministic blank MapLibre style for development and tests. Production deployments must configure a MapLibre-compatible style and tile source whose terms permit browser/public usage. Backend server credentials must not be reused as frontend map tokens.

## Lifecycle

The map is lazy-initialized only after a successful route result exists. A React ref owns the single MapLibre instance. Route changes update existing GeoJSON sources with `setData`; they do not recreate the map. Resize handling uses native `ResizeObserver`.

Map failures are isolated from route results. Invalid geometry, style failure, WebGL failure, or source update failure show a map fallback while summary, cost, vehicle data, form controls, and alternative selection remain usable.

## Scope Boundaries

Future route editing, map-click origin/destination selection, draggable markers, geolocation, traffic, weather, waypoints, navigation instructions, map style switching, analytics, and saved map state remain outside this decision.
