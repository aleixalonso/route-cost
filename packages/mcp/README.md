# route-cost-mcp

A standalone stdio MCP server with `list_vehicles`, `suggest_fuel_price`, and `estimate_route_cost`. The estimate requires live Valhalla and Stadia credentials and refuses mock providers. Routing, geocoding, and Spanish fuel-price requests use the shared adapters in `packages/routing`, `packages/geocoding`, and `packages/fuel-prices`. See [Use it as an MCP server](../../README.md#use-it-as-an-mcp-server). Not published yet.

An estimate requires both routing and `trace_attributes`; Stadia Maps may gate `trace_attributes` by account plan.

Set `STADIA_GEOCODING_API_KEY` for Stadia geocoding. `STADIA_API_KEY` is still accepted as an alias for backward compatibility.
