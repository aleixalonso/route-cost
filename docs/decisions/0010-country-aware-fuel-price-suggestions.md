# 0010 Country-Aware Fuel Price Suggestions

Date: 2026-07-28

## Decision

RouteCost suggests fuel prices from origin coordinates, not from client-supplied country codes. The API resolves the coordinate country through the existing reverse-geocoding provider abstraction, then looks up a country fuel-price provider registered by ISO 3166-1 alpha-2 code.

Spain (`ES`) is the first provider. Other countries return a normal `unsupported-country` response and the user keeps manual fuel-price entry.

## Architecture

```text
coordinate -> CountryResolver -> country code -> provider registry
provider -> normalized stations/prices -> nearby median suggestion
```

The central service depends on `CountryResolver` and `CountryFuelPriceProviderRegistry`. It does not import Spain source fields, URLs, number formats, or product labels. Adding France later means implementing a France provider and registering it for `FR`; the endpoint, country resolver, search radius, and median algorithm stay unchanged.

## Spain Source

Source inspected on 2026-07-28:

- Owner: Ministerio para la Transición Ecológica y el Reto Demográfico / Geoportal Gasolineras.
- Dataset: "Precio de carburantes en las gasolineras españolas".
- Catalog: `https://datos.gob.es/es/catalogo/e05068001-precio-de-carburantes-en-las-gasolineras-espanolas`.
- Distribution selected: official REST JSON endpoint `https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/`.

JSON was selected because it is documented by the official REST help and avoids XLS/spreadsheet parsing. Provider-specific fields remain isolated in the Spain adapter.

## Product Policy

Supported normalized products:

- `petrol-95-e5`
- `diesel-a`

Spain mappings:

- `Precio Gasolina 95 E5` -> `petrol-95-e5`
- `Precio Gasoleo A` -> `diesel-a`

Petrol 98, LPG, CNG, hydrogen, premium fuels, and electric charging are intentionally out of scope.

Catalog petrol internal-combustion and full-hybrid vehicles map to `petrol-95-e5`. Catalog diesel internal-combustion vehicles map to `diesel-a`. Custom vehicles must choose a supported fuel product for automatic suggestions.

## Suggestion Method

The backend uses progressive straight-line radius expansion with default steps `5000,10000,25000` metres. It filters missing, malformed, non-positive, implausible, stale, and wrong-product prices, then returns a nearby median. Median is used instead of cheapest price because it is more resistant to isolated bad or unusual records.

The response includes station count, selected radius, min/max observed price, nearest/farthest station distance, source/retrieval timestamps, stale flag, and attribution.

## Cache

Spain uses a process-local normalized snapshot cache because the official source is national. Defaults:

- TTL: 30 minutes.
- Stale-if-error: 6 hours.
- Request timeout: 10 seconds.

Concurrent refreshes share one promise. Failed refreshes do not replace a good snapshot. No database, Redis, queue, or cron job is used.

## Frontend

The frontend requests suggestions only after origin resolution plus catalog vehicle or custom fuel product selection. Destination changes and route alternative changes do not refetch. Suggested values may populate an empty/suggested field, but manual edits are never overwritten; a new suggestion is shown with an explicit "Use suggested price" action.

The route-cost calculation endpoint remains separate and still receives only a manual numeric fuel price and currency.
