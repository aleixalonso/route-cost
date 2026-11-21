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
- Prefer precise domain types over primitive obsession for closed sets. Use string-literal unions or enum-like `as const` objects for serialized values; use TypeScript `enum` only when its runtime object and nominal typing are explicitly useful.
- Do not widen known values to `string`, `number`, or `boolean` after validation. Preserve narrow types from Zod schemas, constants, and resolvers.
- Use `unknown` at untrusted boundaries, then validate or narrow immediately. Do not cast untrusted input directly into application types.
- Avoid type assertions. If one is necessary, keep it local, explain why the compiler cannot know the invariant, and add a test around the boundary.
- Keep optional fields truly optional. With `exactOptionalPropertyTypes`, omit absent values instead of assigning `undefined`.
- Use exhaustive checks for closed unions in branching logic. Adding a union member should create a compile error until every resolver/classifier/mapper is updated.
- Do not use non-null assertions (`!`) to silence uncertainty. Prove presence with validation, control flow, or an explicit invariant check.
- Do not introduce ambient globals, broad module declarations, or `skipLibCheck` workarounds to hide typing problems.
- Keep runtime validation and static types paired. Zod schemas should be the source of truth for HTTP/env/provider payloads; inferred types should flow from those schemas where practical.
- Parse and normalize external data at the boundary. Internal packages should not receive raw provider payloads, raw request bodies, or loosely typed JSON.
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
- Keep NestJS modules thin. Modules wire dependencies; they should not contain selection logic beyond provider registration factories.
- Controllers validate transport input, call application services, and map responses. They must not contain provider-specific logic, domain calculations, or direct environment access.
- Application services depend on ports/tokens, not concrete infrastructure classes. Concrete adapters belong in infrastructure and are selected in module wiring.
- Inject configuration through validated config objects or `ConfigService` in module/provider factories. Do not read `process.env` in services, controllers, providers, or tests except when testing configuration itself.
- Use explicit injection tokens for ports with multiple implementations. Avoid injecting concrete adapters into use cases.
- Keep provider SDKs, native `fetch`, response schemas, authentication, retries, and timeouts inside infrastructure adapters.
- Map infrastructure errors to stable application-level errors before returning HTTP responses. Do not expose upstream response bodies, stack traces, credentials, or provider-specific payloads.
- Prefer pure functions for mapping, normalization, classification, and calculation. Test them directly before testing the Nest wrapper around them.
- Keep DTO validation in shared contracts or boundary schemas. Do not duplicate incompatible request/response shapes in controllers.
- Do not use request-scoped providers unless there is a measured need; default to singleton providers with explicit per-request data passed as arguments.
- Avoid lifecycle side effects in constructors. Constructors should assign dependencies only; start network listeners, timers, or expensive work explicitly in the appropriate lifecycle or command path.
- Use `Logger` sparingly and sanitize logs. Never log secrets, authorization headers, raw provider bodies, full encoded geometry, or precise personal addresses.
- API integration tests must use `NestFastifyApplication` and `app.inject()`.
- Do not open real network ports in API integration tests.
- Override providers in tests instead of reaching into private fields or relying on global mutable state.
- Close every Nest application created in tests, even on failure paths.
- Swagger must remain disableable through `SWAGGER_ENABLED`.
- The mock routing provider must stay deterministic and internet-free.

## Tooling Notes

- The repo targets Node.js `26.13.1` and pnpm `10.34.3`.
- pnpm is installed with `npm i -g pnpm@10.34.3` because Node no longer ships Corepack.
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
