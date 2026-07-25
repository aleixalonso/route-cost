# 0004: Valhalla Routing Provider

## Status

Accepted.

## Decision

RouteCost uses Valhalla as its first real routing engine. Stadia Maps EU is the hosted Valhalla API used by the application, and the application adapter is named `ValhallaRoutingProvider`.

The adapter keeps Stadia-specific authentication, base URLs, request paths, response schemas, HTTP behavior, and error mapping inside the API infrastructure layer.

## Rationale

Valhalla provides routing profiles that fit the initial vehicle categories. RouteCost maps:

- `car` to `auto`
- `motorcycle` to `motorcycle`
- `maxi-scooter` to `motorcycle`
- `low-speed-scooter` to `motor_scooter`

Maxi scooters use the motorcycle profile because they can travel on motorway-class roads. The `motor_scooter` profile is reserved for low-speed scooters.

Mapbox was not selected because it does not provide a dedicated motorcycle routing profile. Native `fetch` is used instead of a provider SDK so the integration remains small, portable, and isolated.

Live traffic is outside the initial scope.

## Segment Classification

Segment classification is heuristic. It classifies Valhalla edge attributes into `urban`, `interurban`, `motorway`, or `unknown` using road class and density. Raw provider-neutral road attributes are retained on returned segments so the classification can be improved later without changing the provider contract.

## Boundaries

Provider-specific models remain inside `apps/api/src/modules/route-estimation/infrastructure/valhalla`. They are not exported from `@route-cost/routing`, `@route-cost/contracts`, or domain packages.

The mock provider remains the default for local development and automated tests. Automated tests use fixtures and mocked `fetch`; they do not call Stadia Maps.

Hosting, infrastructure migration strategies, self-hosted routing, provider fallback, fuel consumption, and monetary cost calculations are outside this decision.
