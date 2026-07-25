# AGENTS.md

Guidance for AI agents and contributors working in this repository.

RouteCost is a portable TypeScript monorepo. Keep changes small, verified, and aligned with the existing architecture.

## Core Principles

- Prefer simple, direct code over speculative abstractions.
- Make surgical changes. Do not refactor adjacent code unless the task requires it.
- Preserve portability. Do not add hosting-provider runtime coupling or SDKs.
- Do not add product scope early: no database, auth, queues, Redis, real routing providers, analytics, payments, or complete calculator until explicitly requested.
- Keep domain logic, HTTP contracts, API framework code, and web UI clearly separated.
- Do not commit secrets, `.env` files, generated builds, coverage, reports, or `node_modules`.

## Architecture Rules

Allowed dependencies:

```text
web -> contracts
web -> domain only when logic is reusable and safe for the client

api -> contracts
api -> domain
api -> routing
api -> vehicle-data

routing -> contracts or domain when necessary
vehicle-data -> domain/contracts when necessary

packages never -> apps
web never -> api
api never -> web
domain never -> NestJS, React, Fastify, HTTP clients, provider SDKs, or environment variables
contracts never -> NestJS decorators, React, Fastify, Request, or Response
```

Use package-name imports between workspaces, for example:

```ts
import { healthStatusSchema } from '@route-cost/contracts';
```

Use relative imports within a workspace. Do not introduce broad aliases such as `@/*` or `src/*`.

## Implementation Standards

- TypeScript only.
- No `any` unless unavoidable and justified near the integration boundary.
- No business logic in controllers.
- No HTTP calls in `packages/domain`.
- No direct `process.env` reads outside the API configuration module or web environment validation module.
- No direct injection of concrete routing providers into use cases; use the `ROUTING_PROVIDER` token.
- Keep public package exports explicit through `src/index.ts`.
- Use kebab-case for files and folders.
- Leave rounding and presentation formatting out of domain calculations.
- Keep sample vehicle data clearly marked as estimated and not production verified.

## Frontend Standards

- Keep app components in `apps/web`; do not create a shared UI package yet.
- Use relative `/api/v1/...` requests by default.
- Preserve the Vite dev proxy and Docker Nginx `/api/` proxy behavior.
- Validate client environment variables with Zod.
- Tests should assert user-visible behavior, not internal implementation details.

## Backend Standards

- Keep app creation in `create-app.ts`; keep port listening in `main.ts`.
- API integration tests must use `NestFastifyApplication` and `app.inject()`.
- Do not open real network ports in API integration tests.
- Swagger must remain disableable through `SWAGGER_ENABLED`.
- The mock routing provider must stay deterministic and internet-free.

## Tooling Notes

- The repo targets Node.js `24.14.1` and pnpm `10.34.3`.
- Use Corepack and the pinned package manager.
- `pnpm setup` is a pnpm built-in in pnpm 10. Use the project script explicitly:

```bash
pnpm run setup
```

## Verification

For normal code changes, run the narrowest relevant checks first, then broaden as risk increases.

Common checks:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:coverage
pnpm build
pnpm check
```

For browser behavior:

```bash
pnpm test:e2e
```

For Docker changes:

```bash
docker compose build
docker compose up --build -d
pnpm docker:smoke
docker compose down --remove-orphans
```

Do not claim a command passes unless it was actually run.

## Dependency Policy

- Install dependencies with pnpm and let pnpm write version ranges.
- Do not add dependencies unless they solve a current need.
- Do not add provider-specific hosting dependencies.
- If pnpm blocks install scripts, approve only packages that genuinely require them, such as native build tooling used by the installed dependency chain.

## Git Hygiene

- Keep generated files out of commits.
- Before committing, check:

```bash
git status --short --ignored
```

- Conventional commits are preferred, for example:

```text
chore: initialize route-cost monorepo
feat: add route estimate form shell
fix: validate health response parsing
```

## When Unsure

Stop and surface the ambiguity. State the assumptions, the tradeoff, and the smallest safe next step.
