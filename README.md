# RouteCost

RouteCost estimates the real cost of a vehicle route using route characteristics and vehicle-specific consumption data.

This repository is in its initial development phase. It contains a portable monorepo foundation and one minimal health-check vertical slice.

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

## Scripts

- `pnpm dev`: run web, API, and watch builds through Turborepo
- `pnpm check`: format check, lint, typecheck, coverage tests, and build
- `pnpm test`, `pnpm test:coverage`, `pnpm test:integration`, `pnpm test:e2e`: run test layers
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

`pnpm setup` copies `.env.example` files only when a local `.env` does not already exist. The initial mock routing provider requires no API keys.

## Architecture

See [docs/architecture.md](docs/architecture.md). Turborepo remote cache can be added later with `TURBO_TOKEN` and `TURBO_TEAM`; CI does not require either variable.
