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
