# 0011: Route Preferences and Route Characteristics

## Status

Accepted.

## Decision

RouteCost lets users express common route preferences and reports the actual observed characteristics of each returned route, keeping the two concepts strictly separate:

```text
Requested preferences
≠
Observed route characteristics
```

Example:

```text
Requested:
avoidTolls = true

Observed:
tolls.present = true
```

This is a valid outcome. Valhalla preference factors express willingness or aversion and are never an absolute prohibition: sometimes the avoided feature is required to complete a route.

## Provider-Neutral Preferences

The initial user-facing preferences are:

```ts
type RoutePriority = 'fastest' | 'shortest';

interface RoutePreferences {
  readonly avoidTolls: boolean;
  readonly avoidMotorways: boolean;
  readonly avoidFerries: boolean;
  readonly priority: RoutePriority;
}
```

Defaults:

```ts
const DEFAULT_ROUTE_PREFERENCES = {
  avoidTolls: false,
  avoidMotorways: false,
  avoidFerries: false,
  priority: 'fastest',
};
```

The defaults live once in `@route-cost/routing` and are frozen. Transport input accepts a partially supplied object (validated strictly by Zod: real booleans, `fastest`/`shortest` only, unknown fields rejected) and `normalizeRoutePreferences` fills individual defaults. Requests that omit preferences keep working unchanged.

Public contracts never expose Valhalla field names such as `use_tolls`, `use_highways`, `use_ferry`, `use_rail_ferry`, or `use_distance`.

## Valhalla Costing-Option Mapping

The pure mapper `buildValhallaCostingOptions(profile, preferences)` converts preferences to profile-specific Valhalla `costing_options`:

| Preference           | `auto`                          | `motorcycle`                    | `motor_scooter`                           |
| -------------------- | ------------------------------- | ------------------------------- | ----------------------------------------- |
| `avoidTolls`         | `use_tolls: 0/1`                | `use_tolls: 0/1`                | omitted; not exposed by the public schema |
| `avoidMotorways`     | `use_highways: 0/1`             | `use_highways: 0/1`             | omitted; not exposed by the public schema |
| `avoidFerries`       | `use_ferry/use_rail_ferry: 0/1` | `use_ferry/use_rail_ferry: 0/1` | `use_ferry/use_rail_ferry: 0/1`           |
| `priority: fastest`  | `use_distance: 0`               | `shortest: false`               | `shortest: false`                         |
| `priority: shortest` | `use_distance: 1`               | `shortest: true`                | `shortest: true`                          |

Centralized willingness values:

```ts
const VALHALLA_AVOID_FACTOR = 0;
const VALHALLA_ALLOW_FACTOR = 1;
```

### Verified provider behavior

Verified against the current Valhalla API reference and `valhalla` source (Stadia Maps EU runs Valhalla):

- `use_tolls`, `use_highways`, `use_ferry`, and `use_rail_ferry` are range 0–1 willingness factors with documented defaults. Values near 0 attempt to avoid; the provider documentation explicitly notes that a value of 0 is not guaranteed to avoid the feature entirely.
- `use_distance` is documented as available only for `auto` costing. `auto` with `use_distance: 1` still multiplies the toll/highway/ferry factors, so avoidance options keep influencing route selection.
- `motorcycle` and `motor_scooter` express distance-based routing with the `shortest` boolean. Per Valhalla, `shortest: true` is purely distance-based and disables other costing factors and penalties, so combined preferences under `shortest` are limited by provider semantics for these profiles.
- The current Valhalla public schema does not expose `use_tolls` or `use_highways` under `motor_scooter`, so RouteCost omits those unsupported keys for low-speed scooters. Observed characteristics still report actual toll and motorway presence.
- `avoidFerries` maps to both `use_ferry` and `use_rail_ferry` because RouteCost reports both `ferry` and `rail-ferry` edges as user-facing ferries.

The profile mapping stays unchanged:

```text
car → auto
motorcycle → motorcycle
maxi-scooter → motorcycle
low-speed-scooter → motor_scooter
```

### Route and trace consistency

The same normalized preferences and mapped costing options are used for both the route request and every `trace_attributes` request (`shape_match: 'edge_walk'`). Trace describes the selected route rather than rerouting it with incompatible options.

## Trace Attributes

No new trace attributes were required. The existing request already included `edge.toll` and `edge.use`; motorway detection reuses the existing `edge.road_class` classification. The trace attribute filter is unchanged.

## Segment Normalization

Normalized route segments carry explicit, required, nullable feature states:

```ts
interface RouteSegment {
  // ...
  isToll: boolean | null; // null = genuinely unknown
  isFerry: boolean | null; // null = genuinely unknown
}
```

- `isToll` comes from the `edge.toll` attribute. A missing/null attribute maps to `null` (unknown); absence is never invented from missing data.
- `isFerry` is `true` when `edge.use` is `ferry` or `rail-ferry` (both transport the selected road vehicle where the provider allows them), `false` for other known uses, and `null` when `use` is missing.
- Raw Valhalla values are never leaked into public contracts.

## Motorway Detection

The user-facing `containsMotorways` characteristic uses the existing normalized RouteCost category: `roadCategory === 'motorway'`. This is the same motorway/trunk classification used for the cost breakdown, map coloring, and route badges, so the definitions stay consistent. Trunk roads classified as motorway count as motorways, matching the existing cost model.

## Toll Detection

Toll presence is detected exclusively from the explicit `edge.toll` provider attribute. It is never inferred from road names, `AP-` prefixes, country, motorway category, toll booth names, preferences, duration, operators, or OSM strings. No monetary toll price is calculated or returned; toll distance is never called "toll cost".

## Ferry Detection

`containsFerries` means any ferry-like segment that transports the selected road vehicle: both road ferries (`use: ferry`) and rail ferries (`use: rail-ferry`).

## Characteristic Aggregation

`calculateRouteCharacteristics(segments)` is pure and deterministic:

- Presence, summed distance in metres, and normalized segment count per feature.
- Full numeric precision, no rounding, no mutation, no negative distances.
- A segment can count toward several characteristics (for example a tolled motorway counts as tolls and motorways).
- If any segment's feature state is unknown, the whole characteristic is `unknown` (presence cannot be ruled out). Motorway detection is always `known` because road category is always assigned.
- `segmentCount` is the number of normalized contiguous route segments carrying the characteristic; it is not a count of toll booths, payments, roads, or tickets.

The public response uses a discriminated union:

```ts
type RouteFeatureDetection =
  | {
      status: 'known';
      present: boolean;
      distanceMetres: number;
      segmentCount: number;
    }
  | { status: 'unknown' };
```

## Preference Compliance

`calculateRoutePreferenceCompliance(preferences, characteristics)` reports stable conflicts:

```text
avoidTolls && tolls.present      → 'tolls-present'
avoidMotorways && motorways.present → 'motorways-present'
avoidFerries && ferries.present  → 'ferries-present'
```

Conflict ordering is stable (tolls, motorways, ferries). Unknown detection never produces a conflict and never produces an "all clear". Priority is a routing strategy, not an avoidance preference, so it never produces a conflict; "shortest" is the provider's route preference, not a mathematical proof over every possible path.

## Public Response

Every route-cost alternative carries its own `routeCharacteristics` and `preferenceCompliance` derived from its own traced segments. The response also returns the normalized applied `routePreferences` so it is self-describing and fixtures can verify normalization. Requests omitting preferences keep previous behavior.

## Frontend

- Route preferences use native HTML: a `<fieldset>`/`<legend>` "Route preferences" section between vehicle and fuel price, native radio inputs for Fastest/Shortest, and native checkboxes for Avoid toll roads / Avoid motorways / Avoid ferries.
- Wording reflects preference semantics ("Avoid toll roads", never "Never use toll roads") with the note: "Route preferences influence route selection, but a returned route may still include an avoided feature when no reasonable alternative is available."
- React Hook Form owns all preference state; no local storage, URL, or global state persistence.
- Changing a preference does not recalculate; the previous result is marked stale ("Route preferences have changed. Recalculate to update the route.") until resubmission.
- Alternative labels derive from observed characteristics: `Fastest · 27 min · 17,5 km · Tolls · Motorways · No ferries`.
- A grouped inline alert reports conflicts ("You asked to avoid toll roads, but this route still includes 4,2 km of toll roads."). No toasts, modals, or raw conflict codes.
- Characteristics are text-first with localized `es-ES` distances, distinct from the map, and never rendered as `Tolls: €0`.
- No map toll overlay in this milestone: the textual result is mandatory and the map keeps its existing road-category coloring. The map summary paragraph now includes the observed characteristics for accessibility.

## Mock Provider

The deterministic mock provider models the scenarios: default fastest route (tolled motorway, no ferry), toll-avoiding alternative (no tolls, longer), motorway-avoiding route, unavoidable toll (avoidTolls still returns a tolled primary), and a ferry scenario (unavoidable ferry on the primary when avoidFerries is set; a ferry alternative).

## Backwards Compatibility

- Requests omitting `routePreferences` remain valid and resolve to the centralized defaults.
- Vehicle mode XOR, coordinates, fuel price, alternatives, route-cost arithmetic, catalog resolution, and profile mapping are unchanged.
- The response is additive: applied preferences and per-alternative characteristics/compliance are new fields.

## No New Runtime Dependencies

No runtime dependencies were added. The milestone uses existing Zod, React Hook Form, TanStack Query, MapLibre, native controls, and pure TypeScript utilities.

## Potential Future Advanced Options

Numeric willingness sliders, tunnels, bridges, unpaved/primary/residential roads, low-emission zones, traffic, borders, seasonal roads, scenic/curvy/hill preferences, speed/distance limits, departure/arrival time, truck restrictions, exclusion polygons, waypoints, and provider switching remain out of scope.
