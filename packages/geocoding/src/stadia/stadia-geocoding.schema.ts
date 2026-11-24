import { z } from 'zod';

const attributionUrlSchema = z
  .string()
  .url()
  .refine((url) => ['http:', 'https:'].includes(new URL(url).protocol));

const attributionSchema = z.union([
  attributionUrlSchema,
  z.object({ url: attributionUrlSchema }),
]);

const geocodingEnvelopeSchema = z.object({
  attribution: attributionSchema,
});

const autocompletePropertiesSchema = z.object({
  gid: z.string().min(1),
  layer: z.string().min(1),
  name: z.string().min(1),
  coarse_location: z.string().min(1).optional(),
  precision: z.string().optional().nullable(),
});

const locationPropertiesSchema = autocompletePropertiesSchema.extend({
  label: z.string().min(1).optional(),
  formatted_address_line: z.string().min(1).optional(),
  address_components: z
    .object({
      postalcode: z.string().min(1).optional(),
      postcode: z.string().min(1).optional(),
    })
    .passthrough()
    .optional(),
  context: z
    .object({
      iso_3166_a2: z.string().min(1).optional(),
      iso_3166_a3: z.string().min(1).optional(),
      whosonfirst: z
        .object({
          country: z
            .object({
              name: z.string().min(1).optional(),
              abbreviation: z.string().min(1).optional(),
            })
            .passthrough()
            .optional(),
          region: z
            .object({
              name: z.string().min(1).optional(),
            })
            .passthrough()
            .optional(),
          macroregion: z
            .object({
              name: z.string().min(1).optional(),
            })
            .passthrough()
            .optional(),
          county: z
            .object({
              name: z.string().min(1).optional(),
            })
            .passthrough()
            .optional(),
          macrocounty: z
            .object({
              name: z.string().min(1).optional(),
            })
            .passthrough()
            .optional(),
          locality: z
            .object({
              name: z.string().min(1).optional(),
            })
            .passthrough()
            .optional(),
          neighbourhood: z
            .object({
              name: z.string().min(1).optional(),
            })
            .passthrough()
            .optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
  country_code: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
  county: z.string().min(1).optional(),
  locality: z.string().min(1).optional(),
  neighbourhood: z.string().min(1).optional(),
  postalcode: z.string().min(1).optional(),
});

const pointGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
});

export const stadiaErrorResponseSchema = z.object({
  error: z
    .union([
      z.string(),
      z.object({
        code: z.union([z.string(), z.number()]).optional(),
        message: z.string().optional(),
      }),
    ])
    .optional(),
  error_code: z.union([z.string(), z.number()]).optional(),
  status_code: z.union([z.string(), z.number()]).optional(),
});

export const stadiaAutocompleteResponseSchema = z.object({
  type: z.literal('FeatureCollection'),
  geocoding: geocodingEnvelopeSchema,
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      properties: autocompletePropertiesSchema,
    }),
  ),
});

export const stadiaFullLocationResponseSchema = z.object({
  type: z.literal('FeatureCollection'),
  geocoding: geocodingEnvelopeSchema,
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      geometry: pointGeometrySchema,
      bbox: z
        .tuple([z.number(), z.number(), z.number(), z.number()])
        .optional(),
      properties: locationPropertiesSchema,
    }),
  ),
});
