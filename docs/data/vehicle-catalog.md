# Vehicle Catalog Data

RouteCost starts with six curated vehicle entries: three motorcycle-related vehicles and three cars. This is enough to validate catalog lookup, filtering, vehicle selection, and route-cost integration without pretending to cover the market.

The initial set includes cars and motorcycles because RouteCost supports both route categories. The car set includes petrol and diesel combustion Golfs to exercise fuel-type filtering, plus one Toyota full hybrid to exercise powertrain filtering without introducing electric-vehicle energy calculations.

Electric vehicles, plug-in hybrids, LPG, CNG, hydrogen, registration lookup, VIN lookup, and image data are outside this initial backend catalog.

Manufacturer combined-consumption values are recorded when available. Category-specific `urban`, `interurban`, `motorway`, and `unknown` profiles are treated as RouteCost estimates unless the source explicitly publishes category values that map to those categories. Unknown rates are explicit and are not silently copied from another category.

## Uncertainty

`estimated` means category-specific values are derived from combined or phase data and are not verified as exact real-world predictions.

`partially-verified` means at least some category-like values are supported by suitable source data, but not every RouteCost category is directly verified.

`verified` means every RouteCost category value is supported by suitable evidence. None of the initial six entries are marked verified.

`low`, `medium`, and `high` confidence describe how closely the available source data supports the category profile. Initial entries use medium confidence where official combined or manufacturer-stated values exist, while derived category splits remain estimates.

Source URLs and access dates are retained so changes are reviewable. Catalog entries must not be described as exact predictions: consumption varies with rider or driver behavior, payload, weather, traffic, road surface, maintenance, tyres, and measurement cycle.

## Initial Entries

| Vehicle                   | Routing category | Fuel type | Powertrain            | Status      | Confidence |
| ------------------------- | ---------------- | --------- | --------------------- | ----------- | ---------- |
| Honda Forza 350           | `maxi-scooter`   | `petrol`  | `internal-combustion` | `estimated` | `medium`   |
| Yamaha XMAX 300           | `maxi-scooter`   | `petrol`  | `internal-combustion` | `estimated` | `medium`   |
| Honda NX500               | `motorcycle`     | `petrol`  | `internal-combustion` | `estimated` | `medium`   |
| Volkswagen Golf 1.5 TSI   | `car`            | `petrol`  | `internal-combustion` | `estimated` | `medium`   |
| Volkswagen Golf 2.0 TDI   | `car`            | `diesel`  | `internal-combustion` | `estimated` | `medium`   |
| Toyota Corolla 1.8 Hybrid | `car`            | `petrol`  | `full-hybrid`         | `estimated` | `medium`   |
