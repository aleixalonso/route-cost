# 0001: Monorepo

## Decision

Use Turborepo with pnpm workspaces and private internal packages under the `@route-cost` scope.

## Rationale

The web app, API, contracts, and domain logic need to evolve together while preserving clear ownership boundaries. A monorepo gives atomic changes, shared CI, and local workspace linking without publishing packages.

Multiple repositories were not chosen because they would add release coordination and package publishing overhead before the product needs it.
