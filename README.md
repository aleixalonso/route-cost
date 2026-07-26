# RouteCost

RouteCost estimates the real cost of a vehicle route using route characteristics and vehicle-specific consumption data.

This repository is in its initial development phase. It contains a portable monorepo foundation, health checks, backend location search, routing-provider integration, route fuel/cost estimation, and a small static vehicle catalog.

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

`POST /api/v1/route-cost-estimates` calculates route alternatives through the configured routing provider, estimates litres by road category, and estimates fuel cost. It supports catalog mode with `vehicleId` and custom mode with `vehicleCategory` plus `consumptionProfile`. Consumption figures are example or catalog-estimated values unless their metadata says otherwise.

Catalog mode:

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

Custom mode:

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

## Vehicle Catalog

`@route-cost/vehicle-data` owns the static catalog data, validation, filtering, and provenance metadata. No database is required.

```bash
curl \
  "http://localhost:3001/api/v1/vehicles?vehicleCategory=maxi-scooter"
```

```bash
curl \
  "http://localhost:3001/api/v1/vehicles/honda-forza-350-2025"
```

## Location Search

Location search is backend-only. Autocomplete suggestions do not include coordinates; clients must call details after selecting a suggestion. Search and reverse geocoding return normalized coordinates directly. Provider IDs in examples are illustrative and may change.

Autocomplete:

```bash
curl \
  "http://localhost:3001/api/v1/locations/autocomplete?query=Pla%C3%A7a%20Cat&countryCode=ES&language=ca"
```

Search:

```bash
curl \
  "http://localhost:3001/api/v1/locations/search?query=Pla%C3%A7a%20de%20Catalunya%2C%20Barcelona&countryCode=ES&language=ca"
```

Details:

```bash
curl \
  --get \
  --data-urlencode "placeId=<provider-gid>" \
  --data-urlencode "language=ca" \
  "http://localhost:3001/api/v1/locations/details"
```

Reverse:

```bash
curl \
  "http://localhost:3001/api/v1/locations/reverse?latitude=41.387&longitude=2.170&language=ca"
```

Every response includes provider attribution:

```json
{
  "attribution": {
    "url": "https://stadiamaps.com/attribution/"
  }
}
```

Routing endpoints continue accepting coordinates rather than free-form address text.

## Scripts

- `pnpm dev`: run web, API, and watch builds through Turborepo
- `pnpm check`: format check, lint, typecheck, coverage tests, and build
- `pnpm test`, `pnpm test:coverage`, `pnpm test:integration`, `pnpm test:e2e`: run test layers
- `pnpm routing:verify`: manually verify the live Valhalla integration when `VALHALLA_API_KEY` is set
- `pnpm geocoding:verify`: manually verify the live Stadia geocoding integration when `STADIA_GEOCODING_API_KEY` is set
- `pnpm docker:up`, `pnpm docker:smoke`, `pnpm docker:down`: build, smoke-test, and stop Compose

## Structure

- `apps/web`: React, Vite, Tailwind, TanStack Query web app
- `apps/api`: NestJS API on Fastify
- `apps/e2e`: Playwright browser tests
- `packages/domain`: pure business logic
- `packages/contracts`: Zod HTTP contracts
- `packages/geocoding`: provider-neutral geocoding abstraction
- `packages/routing`: provider-neutral routing abstraction
- `packages/vehicle-data`: static curated vehicle catalog with provenance metadata

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
GEOCODING_PROVIDER=mock
```

The Valhalla provider uses Stadia Maps EU and requires server-side credentials:

```dotenv
ROUTING_PROVIDER=valhalla
VALHALLA_API_KEY=<key>
```

The Stadia geocoding provider also uses the EU endpoint and keeps credentials server-side:

```dotenv
GEOCODING_PROVIDER=stadia
STADIA_GEOCODING_API_KEY=<key>
```

Review current Stadia Maps geocoding terms, account plan, and rate limits before a public production launch.

Automated tests never call the live provider. The only live API check introduced by this repository is manual:

```bash
ROUTING_PROVIDER=valhalla VALHALLA_API_KEY=<key> pnpm routing:verify
```

```bash
GEOCODING_PROVIDER=stadia \
STADIA_GEOCODING_API_KEY=<key> \
pnpm geocoding:verify search \
  --query "Plaça de Catalunya, Barcelona" \
  --country-code ES \
  --language ca
```

## Architecture

See [docs/architecture.md](docs/architecture.md). Turborepo remote cache can be added later with `TURBO_TOKEN` and `TURBO_TEAM`; CI does not require either variable.
