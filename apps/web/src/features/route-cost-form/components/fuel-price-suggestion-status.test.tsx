import type { FuelPriceSuggestionResponse } from '@route-cost/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FuelPriceSuggestionStatus } from './fuel-price-suggestion-status';

const availableResponse: FuelPriceSuggestionResponse = {
  status: 'available',
  country: { code: 'ES', name: 'Spain' },
  fuelProduct: 'petrol-95-e5',
  suggestion: {
    suggestedPricePerLitre: { amount: 1.609, currency: 'EUR' },
    method: 'nearby-median',
    stationCount: 5,
    radiusMetres: 10_000,
    minimumPricePerLitre: 1.549,
    maximumPricePerLitre: 1.699,
    nearestStationDistanceMetres: 0,
    farthestStationDistanceMetres: 9_000,
    sourceUpdatedAt: '2026-07-31T20:00:00Z',
    retrievedAt: '2026-07-31T21:00:00Z',
    isStale: false,
    attribution: { label: 'Test data', url: 'https://example.com' },
  },
};

describe('FuelPriceSuggestionStatus', () => {
  it('asks for the origin first', () => {
    renderStatus({ hasOrigin: false });

    expect(screen.getByText('Resolve origin for suggestion.')).toBeVisible();
  });

  it('asks for a vehicle or fuel product selection', () => {
    renderStatus({ hasVehicleSelection: false });

    expect(
      screen.getByText('Choose vehicle or custom fuel product for suggestion.'),
    ).toBeVisible();
  });

  it('shows a loading state before the first response', () => {
    renderStatus({ isLoading: true });

    expect(screen.getByText('Loading nearby fuel price...')).toBeVisible();
  });

  it('shows an error alert when the request fails', () => {
    renderStatus({ isError: true });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The current fuel price could not be retrieved.',
    );
  });

  it('explains unsupported countries', () => {
    renderStatus({
      response: {
        status: 'unsupported-country',
        country: { code: 'FR', name: 'France' },
        fuelProduct: 'petrol-95-e5',
      },
    });

    expect(screen.getByText(/not available in France yet/u)).toBeVisible();
  });

  it('explains when the country cannot be determined', () => {
    renderStatus({
      response: {
        status: 'country-undetermined',
        fuelProduct: 'petrol-95-e5',
      },
    });

    expect(screen.getByText(/could not be determined/u)).toBeVisible();
  });

  it('explains when no nearby prices exist', () => {
    renderStatus({
      response: {
        status: 'no-nearby-prices',
        country: { code: 'ES', name: 'Spain' },
        fuelProduct: 'petrol-95-e5',
        maximumRadiusMetres: 25_000,
      },
    });

    expect(
      screen.getByText(/No recent prices were found near this origin/u),
    ).toBeVisible();
  });

  it('renders the suggestion with price, median, and attribution', () => {
    renderStatus({
      response: availableResponse,
      fuelPriceState: {
        source: 'suggested',
        amountText: '1.609',
        suggestion: availableResponse,
      },
    });

    expect(
      screen.getByText(/Suggested nearby price: 1,609 €\/L for Petrol 95 E5/u),
    ).toBeVisible();
    expect(
      screen.getByText(/Median of 5 stations within 10 km\. Updated/u),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Test data' })).toHaveAttribute(
      'href',
      'https://example.com',
    );
  });

  it('offers the apply button only while the price is manual', () => {
    renderStatus({ response: availableResponse });

    expect(
      screen.queryByRole('button', { name: 'Use suggested price' }),
    ).not.toBeInTheDocument();

    renderStatus({
      response: availableResponse,
      fuelPriceState: { source: 'manual', amountText: '1.5' },
    });

    expect(
      screen.getByRole('button', { name: 'Use suggested price' }),
    ).toBeVisible();
  });

  it('keeps showing the previous suggestion after manual edits', () => {
    renderStatus({
      fuelPriceState: {
        source: 'manual',
        amountText: '1.5',
        previousSuggestion: availableResponse,
      },
    });

    expect(
      screen.getByText(/Suggested nearby price: 1,609 €\/L/u),
    ).toBeVisible();
  });

  it('applies the suggestion through the callback', () => {
    const onUseSuggestion = vi.fn();
    renderStatus({
      response: availableResponse,
      fuelPriceState: { source: 'manual', amountText: '1.5' },
      onUseSuggestion,
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Use suggested price' }),
    );

    expect(onUseSuggestion).toHaveBeenCalledWith(availableResponse);
  });
});

function renderStatus(
  props: Partial<ComponentProps<typeof FuelPriceSuggestionStatus>> = {},
): void {
  render(
    <FuelPriceSuggestionStatus
      response={undefined}
      isLoading={false}
      isError={false}
      hasOrigin
      hasVehicleSelection
      fuelPriceState={{ source: 'empty', amountText: '' }}
      onUseSuggestion={() => undefined}
      {...props}
    />,
  );
}
