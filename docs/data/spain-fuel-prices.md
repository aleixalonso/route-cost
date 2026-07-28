# Spain Fuel Prices

Access date: 2026-07-28

RouteCost uses the official Spanish open dataset "Precio de carburantes en las gasolineras españolas" published through datos.gob.es and Geoportal Gasolineras.

Selected distribution:

```text
https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/
```

Attribution URL:

```text
https://datos.gob.es/es/catalogo/e05068001-precio-de-carburantes-en-las-gasolineras-espanolas
```

Relevant source fields:

- `Fecha`: source snapshot timestamp, format `dd/MM/yyyy HH:mm:ss`, interpreted as Spain local time and normalized to UTC.
- `ListaEESSPrecio`: station rows.
- `IDEESS`: stable station identifier.
- `Latitud`: latitude with comma decimal separator.
- `Longitud (WGS84)`: WGS84 longitude with comma decimal separator.
- `Precio Gasolina 95 E5`: mapped to `petrol-95-e5`.
- `Precio Gasoleo A`: mapped to `diesel-a`.
- `Rótulo`, `Dirección`, `Localidad`, `Provincia`: optional normalized metadata.

Numeric values use localized comma decimals. Empty prices are treated as missing, not zero. Zero, negative, malformed, non-finite, and values above 10 EUR/L are rejected. Invalid coordinates are excluded. Duplicate station ids are merged by fuel product with a deterministic price choice.

Station-level price update timestamps were not available in the selected distribution during inspection, so freshness uses the source snapshot timestamp where supplied and retrieval time separately.

Manual verification:

```bash
pnpm fuel-prices:verify:spain \
  --coordinate "41.387,2.170" \
  --fuel-product petrol-95-e5

pnpm fuel-prices:verify:spain \
  --coordinate "41.387,2.170" \
  --fuel-product diesel-a
```

The command prints normalized counts and suggestion metadata without saving or printing the national dataset.
