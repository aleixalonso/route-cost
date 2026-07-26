# 0008 First Frontend Vertical Slice

## Status

Accepted.

## Decision

The first user-facing RouteCost flow lives at `/` in `apps/web`. It lets a user resolve origin and destination locations, swap them, select either a catalog vehicle or a custom consumption profile, enter EUR fuel price, submit a route-cost estimate, and inspect route metrics, fuel breakdown, vehicle provenance, alternatives, errors, and location attribution.

This milestone does not include a route map. The page includes a bounded future-map placeholder only.

## Frontend Architecture

The web app uses feature folders plus shared frontend primitives:

- `features/location-search`: native-input autocomplete, details resolution, location query keys.
- `features/vehicle-selection`: API-backed native vehicle selector and grouping.
- `features/route-cost-form`: UI-to-contract request mapping and route-cost API call.
- `features/route-cost-results`: route summary, category breakdown, metadata, alternatives.
- `shared/api`: native `fetch` client and typed API errors.
- `shared/components`: small native primitives.
- `shared/lib`: `es-ES` formatters.

Shared contracts are imported from `@route-cost/contracts`. Backend DTOs are not duplicated in frontend components. The request mapper validates with `estimateRouteCostRequestSchema` before transmission.

## UI Rules

The UI is mobile-first. The base layout is a single column, then progressively becomes a form column plus result/map column on large screens. Page and feature containers own spacing, responsive columns, and ordering.

Native HTML is preferred: text inputs, buttons, selects, optgroups, fieldsets, numeric inputs, radios, description lists, and semantic sections. No component library, headless component library, icon library, or state library was added.

Reusable primitives own intrinsic appearance only: typography, border, radius, background, control height, internal padding, disabled state, and focus styles. They do not own page width, sticky/fixed positioning, responsive placement, or external margins. Internal control padding is allowed. Feature components own local behavior such as the autocomplete dropdown positioning.

## State And Data

React Hook Form owns form state. TanStack Query owns server state. Results remain in page memory only. No local storage, session storage, cookies, analytics, or URL persistence is used.

Location autocomplete and place details are separate. Autocomplete suggestions are not submitted. Only resolved locations with coordinates can be used for route-cost submission. Editing selected location text clears the resolved value and requires a new selection.

Vehicle selection is a discriminated union at submission:

- Catalog mode sends `vehicleId` only.
- Custom mode sends `vehicleCategory` and `consumptionProfile` only.

Catalog and custom modes preserve the backend XOR rule.

## Formatting And Accessibility

Distance, duration, litres, consumption rates, and money are formatted in the frontend with native `Intl.NumberFormat` using `es-ES`; currency is fixed to EUR for this milestone.

Accessibility is a first-class requirement. The autocomplete uses ARIA combobox/listbox relationships, native keyboard handling, labelled controls, inline errors, live status text, and normal tab flow. Route alternatives use native radio inputs.

## Dependency Policy

No new dependencies were added. Future dependency additions require explicit justification that the browser, React, shared contracts, or existing local utilities do not already solve the problem.
