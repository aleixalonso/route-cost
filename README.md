# RouteCost

RouteCost estimates the real cost of a vehicle route using route characteristics and vehicle-specific consumption data.

This repository is in its initial development phase. It contains a portable monorepo foundation, health checks, the initial routing-provider slice, and a backend route fuel/cost estimation endpoint.

## Requirements

- Node.js Active LTS, pinned in `.node-version` and `.nvmrc`
- Corepack
- pnpm
- Docker, optional

## Quick Start

```bash
corepack enable
pnpm install
pnpm setup
pnpm dev
```

## Local URLs

- Frontend: http://localhost:5173
- API: http://localhost:3001
- Swagger: http://localhost:3001/docs
- Health: http://localhost:3001/api/v1/health/ready

## Route Cost Estimates

`POST /api/v1/route-cost-estimates` calculates route alternatives through the configured routing provider, estimates litres by road category, and estimates fuel cost. Consumption figures are example values only.

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

## Scripts

- `pnpm dev`: run web, API, and watch builds through Turborepo
- `pnpm check`: format check, lint, typecheck, coverage tests, and build
- `pnpm test`, `pnpm test:coverage`, `pnpm test:integration`, `pnpm test:e2e`: run test layers
- `pnpm routing:verify`: manually verify the live Valhalla integration when `VALHALLA_API_KEY` is set
- `pnpm docker:up`, `pnpm docker:smoke`, `pnpm docker:down`: build, smoke-test, and stop Compose

## Structure

- `apps/web`: React, Vite, Tailwind, TanStack Query web app
- `apps/api`: NestJS API on Fastify
- `apps/e2e`: Playwright browser tests
- `packages/domain`: pure business logic
- `packages/contracts`: Zod HTTP contracts
- `packages/routing`: provider-neutral routing abstraction
- `packages/vehicle-data`: estimated sample vehicle catalog

## Tests

```bash
pnpm test
pnpm test:coverage
pnpm test:integration
pnpm test:e2e
```

## Docker

```bash
pnpm docker:up
pnpm docker:smoke
pnpm docker:down
```

The Docker web app is exposed at http://localhost:8080 and proxies `/api/` to the API service.

## Environment Variables

`pnpm setup` copies `.env.example` files only when a local `.env` does not already exist.

The mock provider is the default and requires no network access:

```dotenv
ROUTING_PROVIDER=mock
```

The Valhalla provider uses Stadia Maps EU and requires server-side credentials:

```dotenv
ROUTING_PROVIDER=valhalla
VALHALLA_API_KEY=<key>
```

Automated tests never call the live provider. The only live API check introduced by this repository is manual:

```bash
ROUTING_PROVIDER=valhalla VALHALLA_API_KEY=<key> pnpm routing:verify
```

## Architecture

See [docs/architecture.md](docs/architecture.md). Turborepo remote cache can be added later with `TURBO_TOKEN` and `TURBO_TEAM`; CI does not require either variable.
