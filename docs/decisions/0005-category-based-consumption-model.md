# 0005 Category-Based Consumption Model

## Status

Accepted.

## Context

RouteCost needs a first complete backend route-cost estimation flow that can work with normalized route alternatives from the existing `RoutingProvider`. The route classifier already exposes four provider-neutral road categories:

- `urban`
- `interurban`
- `motorway`
- `unknown`

## Decision

The initial fuel model uses one litres-per-100-kilometres consumption rate per road category. API clients must provide all four rates explicitly. Unknown route segments use only `unknownLitresPer100Km`; they do not silently reuse any known-category rate.

Fuel price is supplied as currency units per litre with a structural three-uppercase-letter currency identifier such as `EUR`, `USD`, or `GBP`. The backend performs no currency conversion and does not maintain an ISO currency registry.

Calculations use JavaScript numbers. Domain and application logic do not round, format values as strings, append units, or round monetary estimates to two decimals. Display precision belongs to clients.

The endpoint accepts a custom consumption profile in the request instead of a persisted vehicle ID.

## Consequences

This model is intentionally simpler than a speed-based consumption curve. Elevation, traffic, weather, payload, driving style, passenger count, luggage, temperature, automatic fuel prices, vehicle catalogs, and electric-vehicle energy consumption are outside the initial model.

The output is an estimate, not an accounting value. Decimal arithmetic and persisted monetary minor units can be reconsidered later if RouteCost handles financial transactions.
