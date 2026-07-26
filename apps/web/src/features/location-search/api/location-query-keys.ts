export interface NormalizedAutocompleteParameters {
  readonly query: string;
  readonly countryCode: 'ES';
  readonly language: string;
  readonly limit: number;
}

export const locationQueryKeys = {
  root: ['locations'] as const,
  autocomplete: (parameters: NormalizedAutocompleteParameters) =>
    [...locationQueryKeys.root, 'autocomplete', parameters] as const,
  details: (placeId: string, language: string) =>
    [...locationQueryKeys.root, 'details', placeId, language] as const,
};
