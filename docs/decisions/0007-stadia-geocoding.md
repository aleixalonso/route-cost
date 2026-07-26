# 0007 Stadia Geocoding

RouteCost uses Stadia Maps Geocoding v2 for backend location search.

## Decision

- Use the Stadia Maps EU API endpoint.
- Isolate provider access behind `@route-cost/geocoding` and the API `GEOCODING_PROVIDER` token.
- Implement `StadiaGeocodingProvider` in API infrastructure.
- Use native `fetch` instead of the Stadia SDK.
- Keep autocomplete, search, place details, and reverse geocoding as separate operations.
- Treat autocomplete as suggestions only; autocomplete responses intentionally do not expose coordinates.
- Resolve a selected autocomplete `gid` through place details.
- Treat GIDs as opaque provider IDs and do not assume permanent stability.
- Normalize search and reverse responses from GeoJSON into provider-neutral models.
- Preserve provider attribution in every response.
- Keep `mock` as the default provider for local development and automated tests.

## Out of Scope

- Persistent storage.
- Response caching.
- Frontend debounce, search boxes, maps, markers, or attribution rendering.
- Geocoding inside route or route-cost requests.
- Provider fallback or automatic failover.

Public production launch requires reviewing the provider's current terms, account plan, and rate limits. The application does not implement legal or billing logic.
