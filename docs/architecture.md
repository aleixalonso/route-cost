# RouteCost Architecture

## Dependency Rules

```text
web -> contracts
web -> domain when logic is reusable and safe for the client

api -> contracts
api -> domain
api -> routing
api -> vehicle-data

routing -> contracts or domain when necessary
vehicle-data -> domain/contracts

packages never -> apps
web never -> api
api never -> web
```

Packages expose public APIs through `src/index.ts`. Applications must not deep-import another app.

## Layers

Presentation handles HTTP controllers and React views.

Application coordinates use cases and ports, such as the route estimation service depending on `ROUTING_PROVIDER`.

Domain contains deterministic business logic with no framework, network, or persistence dependencies.

Infrastructure contains adapters such as the initial mock routing provider. Full hexagonal structure is not required for trivial endpoints, but provider-specific models must not leak into contracts or domain logic.

## Routing

`@route-cost/routing` owns provider-neutral routing models, the `RoutingProvider` port, vehicle-category profile resolution, segment classification, and route distance summaries.

The API registers the provider behind the `ROUTING_PROVIDER` injection token:

```dotenv
ROUTING_PROVIDER=mock
```

selects the deterministic mock provider and requires no network access.

```dotenv
ROUTING_PROVIDER=valhalla
VALHALLA_API_KEY=<key>
```

selects `ValhallaRoutingProvider`, which calls the Stadia Maps EU Valhalla API from API infrastructure only. Stadia authentication, URLs, response schemas, and HTTP errors stay under `apps/api/src/modules/route-estimation/infrastructure/valhalla`.

`POST /api/v1/routes` accepts provider-neutral coordinates, vehicle category, and alternatives. It returns normalized alternatives, encoded polylines, classified segments, and route distance summaries.

`POST /api/v1/route-cost-estimates` uses the same `RoutingProvider` and route summaries, then calls pure domain functions to estimate fuel consumption and fuel cost for each route alternative. The request can select a catalog vehicle by `vehicleId` or supply a custom category consumption profile in litres per 100 kilometres plus fuel price in currency units per litre. Consumption values in examples and catalog category profiles may be estimated.

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
