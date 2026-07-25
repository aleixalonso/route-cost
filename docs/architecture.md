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

`POST /api/v1/routes` accepts provider-neutral coordinates, vehicle category, and alternatives. It returns normalized alternatives, encoded polylines, classified segments, and route distance summaries. Fuel consumption and monetary cost calculations are intentionally outside this endpoint.

Automated tests mock network access and use sanitized fixtures. The manual live check is:

```bash
ROUTING_PROVIDER=valhalla VALHALLA_API_KEY=<key> pnpm routing:verify
```
