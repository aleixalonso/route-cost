# 0006 Static Vehicle Catalog

## Status

Accepted.

## Context

RouteCost needs catalog-backed route-cost estimates while preserving the existing custom consumption-profile flow. The first catalog must be small, reviewable, and backend-only.

## Decision

The initial vehicle catalog is static and version-controlled in `@route-cost/vehicle-data`. It contains exactly six curated entries: three motorcycle-related vehicles and three cars.

A database is intentionally not used. Static files keep catalog changes visible in code review and avoid persistence, migrations, authentication, or administration scope.

Every entry includes provenance metadata. Official combined consumption is recorded when available. RouteCost category-specific profiles may be estimated and must be labelled with status and confidence.

The API supports both catalog and custom profiles. Catalog selection uses `vehicleId`; custom selection keeps `vehicleCategory` plus `consumptionProfile`. These modes are mutually exclusive.

Application services depend on the `VEHICLE_CATALOG` port so storage details stay outside use cases.

Electric and plug-in hybrid calculations remain outside scope. Frontend concerns also remain outside the catalog package.

## Consequences

Catalog data is easy to inspect and test. Expanding beyond six vehicles requires deliberate data review. The backend can resolve catalog vehicles without external runtime calls or credentials.
