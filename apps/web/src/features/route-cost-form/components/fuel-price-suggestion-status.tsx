import type { FuelPriceSuggestionResponse } from '@route-cost/contracts';

import { Button } from '../../../shared/components';
import { InlineAlert } from '../../../shared/components';
import { formatDistanceMetres } from '../../../shared/lib/format-distance';
import { formatFuelPrice } from '../../../shared/lib/format-fuel-price';
import { formatFuelProduct } from '../../../shared/lib/format-fuel-product';
import { formatTimestamp } from '../../../shared/lib/format-timestamp';

export type FuelPriceInputState =
  | {
      readonly source: 'empty';
      readonly amountText: string;
    }
  | {
      readonly source: 'suggested';
      readonly amountText: string;
      readonly suggestion: FuelPriceSuggestionResponse;
    }
  | {
      readonly source: 'manual';
      readonly amountText: string;
      readonly previousSuggestion?: FuelPriceSuggestionResponse;
    };

export function FuelPriceSuggestionStatus({
  response,
  isLoading,
  isError,
  hasOrigin,
  hasVehicleSelection,
  fuelPriceState,
  onUseSuggestion,
}: {
  readonly response: FuelPriceSuggestionResponse | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly hasOrigin: boolean;
  readonly hasVehicleSelection: boolean;
  readonly fuelPriceState: FuelPriceInputState;
  readonly onUseSuggestion: (response: FuelPriceSuggestionResponse) => void;
}) {
  const latestSuggestion =
    response?.status === 'available' ? response : undefined;
  const manualSuggestion =
    fuelPriceState.source === 'manual' &&
    fuelPriceState.previousSuggestion?.status === 'available'
      ? fuelPriceState.previousSuggestion
      : undefined;
  const suggestion = latestSuggestion ?? manualSuggestion;

  if (!hasOrigin) {
    return (
      <p className="text-sm text-slate-600">Resolve origin for suggestion.</p>
    );
  }

  if (!hasVehicleSelection) {
    return (
      <p className="text-sm text-slate-600">
        Choose vehicle or custom fuel product for suggestion.
      </p>
    );
  }

  if (isLoading && response === undefined) {
    return (
      <p className="text-sm text-slate-600">Loading nearby fuel price...</p>
    );
  }

  if (isError) {
    return (
      <InlineAlert tone="error">
        The current fuel price could not be retrieved. Enter it manually.
      </InlineAlert>
    );
  }

  if (response?.status === 'unsupported-country') {
    return (
      <InlineAlert>
        Automatic fuel prices are not available in{' '}
        {response.country.name ?? response.country.code} yet. Enter the price
        manually.
      </InlineAlert>
    );
  }

  if (response?.status === 'country-undetermined') {
    return (
      <InlineAlert>
        The country for this origin could not be determined. Enter the price
        manually.
      </InlineAlert>
    );
  }

  if (response?.status === 'no-nearby-prices') {
    return (
      <InlineAlert>
        No recent prices were found near this origin. Enter the price manually.
      </InlineAlert>
    );
  }

  if (suggestion === undefined) {
    return null;
  }

  const shouldShowApply = fuelPriceState.source === 'manual';

  return (
    <div className="grid gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
      <p className="font-semibold">
        Suggested nearby price:{' '}
        {formatFuelPrice(
          suggestion.suggestion.suggestedPricePerLitre.amount,
          suggestion.suggestion.suggestedPricePerLitre.currency,
        )}{' '}
        for {formatFuelProduct(suggestion.fuelProduct)}
      </p>
      <p>
        Median of {suggestion.suggestion.stationCount} stations within{' '}
        {formatDistanceMetres(suggestion.suggestion.radiusMetres)}. Updated{' '}
        {formatTimestamp(
          suggestion.suggestion.sourceUpdatedAt ??
            suggestion.suggestion.retrievedAt,
        )}
        .
      </p>
      {suggestion.suggestion.isStale ? (
        <p>The latest available price data may be out of date.</p>
      ) : null}
      {suggestion.suggestion.attribution === undefined ? null : (
        <p>
          <a
            href={suggestion.suggestion.attribution.url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            {suggestion.suggestion.attribution.label}
          </a>
        </p>
      )}
      {shouldShowApply ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => onUseSuggestion(suggestion)}
        >
          Use suggested price
        </Button>
      ) : null}
    </div>
  );
}
