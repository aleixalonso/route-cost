import { z } from 'zod';

import { coordinatesSchema } from '../route/coordinates.schema.js';

export const maxLocationResultsLimit = 10;

export const locationTypeSchema = z.enum([
  'address',
  'street',
  'point-of-interest',
  'postal-code',
  'neighbourhood',
  'locality',
  'county',
  'region',
  'country',
  'other',
]);

export const locationPrecisionSchema = z.enum(['point', 'centroid', 'unknown']);

export const locationAttributionSchema = z.object({
  url: z
    .string()
    .url()
    .refine((url) => ['http:', 'https:'].includes(new URL(url).protocol)),
});

const languageSchema = z
  .string()
  .trim()
  .max(35)
  .regex(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/)
  .optional();

const countryCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2,3}$/))
  .optional();

const querySchema = z
  .string()
  .trim()
  .min(3)
  .max(200)
  .refine((value) => /\S/.test(value));

const limitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(maxLocationResultsLimit)
  .optional();

const focusFieldsSchema = z
  .object({
    focusLatitude: z.coerce.number().min(-90).max(90).optional(),
    focusLongitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine(
    (query) =>
      (query.focusLatitude === undefined &&
        query.focusLongitude === undefined) ||
      (query.focusLatitude !== undefined && query.focusLongitude !== undefined),
    {
      path: ['focusLatitude'],
      message: 'Focus latitude and longitude must be provided together.',
    },
  );

export const autocompleteLocationsQuerySchema = z
  .object({
    query: querySchema,
    limit: limitSchema,
    language: languageSchema,
    countryCode: countryCodeSchema,
  })
  .and(focusFieldsSchema);

export const searchLocationsQuerySchema = autocompleteLocationsQuerySchema;

export const locationDetailsQuerySchema = z.object({
  placeId: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((value) => !containsControlCharacter(value)),
  language: languageSchema,
});

export const reverseGeocodeQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  limit: limitSchema,
  language: languageSchema,
  countryCode: countryCodeSchema,
});

export const autocompleteSuggestionSchema = z.object({
  id: z.string().min(1),
  primaryText: z.string().min(1),
  secondaryText: z.string().min(1).optional(),
  type: locationTypeSchema,
  precision: locationPrecisionSchema,
});

export const boundingBoxSchema = z
  .object({
    west: z.number().min(-180).max(180),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    north: z.number().min(-90).max(90),
  })
  .refine(
    (box) => box.west <= box.east && box.south <= box.north,
    'Invalid bounding box.',
  );

export const geocodedLocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  label: z.string().min(1),
  formattedAddress: z.string().min(1).optional(),
  coordinate: coordinatesSchema,
  boundingBox: boundingBoxSchema.optional(),
  type: locationTypeSchema,
  precision: locationPrecisionSchema,
  countryCode: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
  county: z.string().min(1).optional(),
  locality: z.string().min(1).optional(),
  neighbourhood: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
});

export const autocompleteLocationsResponseSchema = z.object({
  items: z.array(autocompleteSuggestionSchema).readonly(),
  attribution: locationAttributionSchema,
});

export const searchLocationsResponseSchema = z.object({
  items: z.array(geocodedLocationSchema).readonly(),
  attribution: locationAttributionSchema,
});

export const locationDetailsResponseSchema = z.object({
  location: geocodedLocationSchema,
  attribution: locationAttributionSchema,
});

export const reverseGeocodeResponseSchema = searchLocationsResponseSchema;

export type AutocompleteLocationsQuery = z.infer<
  typeof autocompleteLocationsQuerySchema
>;
export type SearchLocationsQuery = z.infer<typeof searchLocationsQuerySchema>;
export type LocationDetailsQuery = z.infer<typeof locationDetailsQuerySchema>;
export type ReverseGeocodeQuery = z.infer<typeof reverseGeocodeQuerySchema>;
export type AutocompleteLocationsResponse = z.infer<
  typeof autocompleteLocationsResponseSchema
>;
export type SearchLocationsResponse = z.infer<
  typeof searchLocationsResponseSchema
>;
export type LocationDetailsResponse = z.infer<
  typeof locationDetailsResponseSchema
>;
export type ReverseGeocodeResponse = z.infer<
  typeof reverseGeocodeResponseSchema
>;

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}
