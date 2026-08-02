import type { FuelPriceSuggestionResponse } from '@route-cost/contracts';

import { InlineAlert } from '../../../shared/components';
import { formatFuelPrice } from '../../../shared/lib/format-fuel-price';
import { formatFuelProduct } from '../../../shared/lib/format-fuel-product';

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
  onLoadSuggestion,
  onUseSuggestion,
}: {
  readonly response: FuelPriceSuggestionResponse | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly hasOrigin: boolean;
  readonly hasVehicleSelection: boolean;
  readonly fuelPriceState: FuelPriceInputState;
  readonly onLoadSuggestion: () => void;
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

  if (
    fuelPriceState.source === 'manual' &&
    suggestion === undefined &&
    fuelPriceState.amountText !== ''
  ) {
    return (
      <button
        type="button"
        onClick={onLoadSuggestion}
        className="justify-self-start text-left text-sm font-semibold text-blue-600 underline-offset-2 hover:underline"
      >
        Load suggested price
      </button>
    );
  }

  if (isLoading && response === undefined) {
    return (
      <p className="text-sm text-slate-600">Loading nearby fuel price...</p>
    );
  }

  if (isError && fuelPriceState.source !== 'manual') {
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
    <p className="text-sm text-slate-600">
      Suggested nearby price:{' '}
      {formatFuelPrice(
        suggestion.suggestion.suggestedPricePerLitre.amount,
        suggestion.suggestion.suggestedPricePerLitre.currency,
      )}{' '}
      for {formatFuelProduct(suggestion.fuelProduct)}
      {shouldShowApply ? (
        <>
          {' '}
          <button
            type="button"
            onClick={() => onUseSuggestion(suggestion)}
            className="justify-self-start text-left text-sm font-semibold text-blue-600 underline-offset-2 hover:underline"
          >
            Use suggested price
          </button>
        </>
      ) : null}
    </p>
  );
}
