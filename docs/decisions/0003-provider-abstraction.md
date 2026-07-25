# 0003: Routing Provider Abstraction

## Decision

Expose routing through a provider-neutral `RoutingProvider` interface and register the implementation through the `ROUTING_PROVIDER` injection token.

## Rationale

The first implementation is a deterministic mock provider so tests and demos run without internet access or API keys. Future adapters may target routing engines such as hosted APIs or self-hosted services, but provider-specific request and response models must not leak into HTTP contracts or domain logic.
