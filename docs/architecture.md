# RouteCost Architecture

## Dependency Rules

```text
web -> contracts
web -> domain when logic is reusable and safe for the client

api -> contracts
api -> domain
api -> geocoding
api -> fuel-prices
api -> routing
api -> vehicle-data

routing -> contracts or domain when necessary
vehicle-data -> domain/contracts
contracts -> shared schemas where appropriate
contracts -> fuel-prices for normalized fuel product constants

packages never -> apps
web never -> api
api never -> web
geocoding never -> api
geocoding never -> contracts unless current package layering explicitly permits it
geocoding never -> Stadia-specific models
fuel-prices never -> api
fuel-prices never -> country-specific provider source formats
```

Packages expose public APIs through `src/index.ts`. Applications must not deep-import another app.

## Layers

Presentation handles HTTP controllers and React views.

Application coordinates use cases and ports, such as the route estimation service depending on `ROUTING_PROVIDER`.

Domain contains deterministic business logic with no framework, network, or persistence dependencies.

Infrastructure contains adapters such as the initial mock routing provider. Full hexagonal structure is not required for trivial endpoints, but provider-specific models must not leak into contracts or domain logic.

## API Contract

The OpenAPI document derives its named component schemas from the Zod contracts in `packages/contracts` through the registry in `apps/api/src/openapi`. Component names follow the registry keys. `/docs-json` is the machine-readable contract; operations reference those components for request and response bodies.

Every HTTP error has the same envelope:

```json
{
  "statusCode": 400,
  "code": "INVALID_LOCATION_QUERY",
  "message": "Validation failed",
  "fields": ["query"]
}
```

All four keys are always present. `statusCode` matches the HTTP status. Validation failures list offending request field paths in `fields`; every other error uses `[]`. Application and provider failures retain their stable machine codes. Framework failures, including the throttler's 429 response, receive codes derived from HTTP status. The shared envelope schema appears as `components.schemas.ErrorResponse` in OpenAPI.

## Web Frontend

The first web vertical slice is implemented at `/` as a mobile-first route estimator. It uses React, Vite, Tailwind CSS, TanStack Query, React Hook Form, React Router, and shared Zod contracts.

Feature folders own user-facing behavior:

```text
apps/web/src/pages/route-estimator
apps/web/src/features/location-search
apps/web/src/features/vehicle-selection
apps/web/src/features/route-cost-form
apps/web/src/features/route-cost-results
apps/web/src/features/route-map
apps/web/src/shared/api
apps/web/src/shared/components
apps/web/src/shared/lib
```

The dependency direction is:

```text
app -> pages -> features -> shared
features -> shared
shared -> no feature imports
web -> @route-cost/contracts
```

The page owns responsive layout and spacing. Shared primitives own only intrinsic control appearance and native semantics. They do not impose external margins, sticky positioning, page widths, or responsive placement.

Location text and resolved locations are separate state. Autocomplete suggestions do not include coordinates; after selection the frontend calls location details, stores the resolved coordinate, and only then allows route-cost submission. Editing selected text clears the resolved location.

Vehicle mode is represented as a discriminated union at the submit boundary. Catalog mode sends `vehicleId` only. Custom mode sends `vehicleCategory` plus `consumptionProfile` only. The mapper validates the final request with `estimateRouteCostRequestSchema`.

Results stay in page memory and are not persisted to local storage, session storage, cookies, or the URL. Distances, durations, litres, consumption rates, and EUR money are formatted in the frontend with `es-ES`.

The route map visualizes only the selected route alternative returned by the backend:

```text
Selected route alternative
   |
   v
Geometry decoder
   |
   v
Provider-neutral route coordinates
   |
   |-- Full route GeoJSON
   |-- Categorized segment GeoJSON
   `-- Route bounds
          |
          v
      RouteMapCanvas
          |
          v
       MapLibre
```

The route-map feature may depend on shared contracts, shared frontend components/utilities, and MapLibre. It must not depend on backend provider models or route calculation logic:

```text
route-map feature
-> shared contracts
-> shared components
-> MapLibre

route-map never -> backend provider models
route-map never -> route calculation logic
```

MapLibre is initialized lazily after a successful route result exists. The frontend decodes Valhalla polyline6 geometry, converts latitude/longitude coordinates to GeoJSON longitude/latitude order at the GeoJSON boundary, slices categorized segments with backend inclusive shape-point indexes, and fits the selected route bounds. It does not calculate routes, classify roads, snap geometry, or request map-provider routes.

`VITE_MAP_STYLE_URL` configures the MapLibre-compatible style exposed to the browser. The default local `/map-style.json` contains no external tile source and keeps automated tests deterministic.

## Routing

`@route-cost/routing` owns provider-neutral routing models, the `RoutingProvider` port, vehicle-category profile resolution, segment classification, route distance summaries, route preferences (with centralized defaults), observed route characteristics aggregation, and preference compliance.

Route preferences flow through the stack without leaking provider terms:

```text
User preferences
   │
   ▼
Provider-neutral RoutePreferences
   │
   ▼
Valhalla costing-options mapper
   │
   ▼
Route alternatives
   │
   ▼
Trace attributes
   │
   ▼
Observed characteristics
   │
   ▼
Preference compliance
   │
   ▼
Frontend comparison
```

`POST /api/v1/route-cost-estimates` accepts an optional provider-neutral `routePreferences` object (`avoidTolls`, `avoidMotorways`, `avoidFerries`, `priority`). Omitted or partial objects resolve to the centralized defaults in `@route-cost/routing`. The Valhalla adapter maps compatible preferences to costing options (`use_tolls`, `use_highways`, `use_ferry`, `use_rail_ferry`, and `use_distance` for auto or `shortest` for motorcycle/motor_scooter) and applies the same options to route and `trace_attributes` requests. Unsupported Valhalla options for `motor_scooter` are omitted. The application service then computes per-alternative observed characteristics and preference compliance from the traced segments and returns them together with the normalized applied preferences.

See [docs/decisions/0011-route-preferences-and-characteristics.md](decisions/0011-route-preferences-and-characteristics.md) for the exact mapping, provider verification, and detection policies.

The API registers the provider behind the `ROUTING_PROVIDER` injection token:

```dotenv
ROUTING_PROVIDER=mock
```

## Fuel Price Suggestions

`@route-cost/fuel-prices` owns provider-neutral fuel products, station price models, country provider registry, haversine distance calculation, progressive nearby station selection, and median suggestion calculation. Its provider-neutral core has no NestJS, Fastify, React, environment, geocoding provider, or Spain source dependency.

The API module resolves:

```text
origin coordinate -> CountryResolver -> ISO country code -> registry -> provider
```

Country resolution uses the existing reverse-geocoding provider abstraction. Clients do not send country codes. The central suggestion service depends on `COUNTRY_RESOLVER` and `COUNTRY_FUEL_PRICE_PROVIDER_REGISTRY`, so country-specific adapters are hidden behind provider interfaces.

Spain is registered as `ES`. Its adapter in `packages/fuel-prices` owns official REST JSON retrieval, Spanish field names, comma-decimal parsing, WGS84 coordinate parsing, normalized station snapshots, and process-local cache behavior. The framework-agnostic factory is consumed by both `apps/api` and `packages/mcp`. Unsupported countries return structured `200 OK` availability responses so route-cost calculation can continue with manual price input.

selects the deterministic mock provider and requires no network access.

```dotenv
ROUTING_PROVIDER=valhalla
VALHALLA_API_KEY=<key>
```

selects the Valhalla routing provider, which calls the Stadia Maps EU Valhalla API. Its authentication, URLs, response schemas, and HTTP errors live in `packages/routing`. The framework-agnostic factory is consumed by both `apps/api` and `packages/mcp`.

`POST /api/v1/routes` accepts provider-neutral coordinates, vehicle category, and alternatives. It returns normalized alternatives, encoded polylines, classified segments, and route distance summaries.

`POST /api/v1/route-cost-estimates` uses the same `RoutingProvider` and route summaries, then calls pure domain functions to estimate fuel consumption and fuel cost for each route alternative. The request can select a catalog vehicle by `vehicleId` or supply a custom category consumption profile in litres per 100 kilometres plus fuel price in currency units per litre, and can supply optional route preferences. Consumption values in examples and catalog category profiles may be estimated. Each alternative includes its observed route characteristics and preference compliance.

```bash
curl \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{
    "origin": {
      "latitude": 41.3902,
      "longitude": 2.154
    },
    "destination": {
      "latitude": 41.5912,
      "longitude": 1.5209
    },
    "vehicleCategory": "maxi-scooter",
    "consumptionProfile": {
      "urbanLitresPer100Km": 3.8,
      "interurbanLitresPer100Km": 3.0,
      "motorwayLitresPer100Km": 4.1,
      "unknownLitresPer100Km": 3.4
    },
    "fuelPrice": {
      "amountPerLitre": 1.6,
      "currency": "EUR"
    },
    "routePreferences": {
      "avoidTolls": false,
      "avoidMotorways": false,
      "avoidFerries": false,
      "priority": "fastest"
    },
    "alternatives": 1
  }' \
  http://localhost:3001/api/v1/route-cost-estimates
```

Catalog mode resolves the vehicle through the API `VEHICLE_CATALOG` port before routing:

```bash
curl \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{
    "origin": {
      "latitude": 41.3902,
      "longitude": 2.154
    },
    "destination": {
      "latitude": 41.5912,
      "longitude": 1.5209
    },
    "vehicleId": "honda-forza-350-2025",
    "fuelPrice": {
      "amountPerLitre": 1.6,
      "currency": "EUR"
    },
    "routePreferences": {
      "avoidTolls": false,
      "avoidMotorways": false,
      "avoidFerries": false,
      "priority": "fastest"
    },
    "alternatives": 1
  }' \
  http://localhost:3001/api/v1/route-cost-estimates
```

## Vehicles

`@route-cost/vehicle-data` owns static provider-neutral catalog data, Zod validation, query functions, and source metadata. The API exposes it through:

```text
GET /api/v1/vehicles
GET /api/v1/vehicles/:vehicleId
```

Examples:

```bash
curl \
  "http://localhost:3001/api/v1/vehicles?vehicleCategory=maxi-scooter"
```

```bash
curl \
  "http://localhost:3001/api/v1/vehicles/honda-forza-350-2025"
```

No database, ORM, or external runtime data fetch is required for the catalog.

Automated tests mock network access and use sanitized fixtures. The manual live check is:

```bash
ROUTING_PROVIDER=valhalla VALHALLA_API_KEY=<key> pnpm routing:verify
```

## Location Search

`@route-cost/geocoding` owns provider-neutral location models, request/result types, provider errors, and the `GeocodingProvider` port. Its provider-neutral core has no NestJS, Fastify, environment, React, MapLibre, or Stadia response dependencies.

The API registers backend geocoding behind the `GEOCODING_PROVIDER` token:

```text
HTTP controller
   |
   v
Application service
   |
   v
GEOCODING_PROVIDER
   |-- MockGeocodingProvider
   `-- StadiaGeocodingProvider
          |
          v
     Stadia Maps v2
```

```dotenv
GEOCODING_PROVIDER=mock
```

selects deterministic Barcelona-area data and requires no credentials.

```dotenv
GEOCODING_PROVIDER=stadia
STADIA_GEOCODING_API_KEY=<key>
```

selects Stadia Maps Geocoding v2 over the EU endpoint. The API key is sent in the `Authorization` header and never returned to clients.

The Stadia adapter lives in `packages/geocoding`. Its framework-agnostic factory is consumed by both `apps/api` and `packages/mcp`.

The API exposes:

```text
GET /api/v1/locations/autocomplete
GET /api/v1/locations/search
GET /api/v1/locations/details
GET /api/v1/locations/reverse
```

Autocomplete returns suggestions without coordinates. Clients call details after a suggestion is selected. Search and reverse return normalized locations with coordinates and attribution.

Routing remains coordinate-based. `POST /api/v1/routes` and `POST /api/v1/route-cost-estimates` do not accept free-form location text.
