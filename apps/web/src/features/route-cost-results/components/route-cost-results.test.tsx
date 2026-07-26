import type { EstimateRouteCostResponse } from '@route-cost/contracts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RouteCostResults } from './route-cost-results';

const result = {
  vehicle: {
    source: 'custom',
    vehicleCategory: 'maxi-scooter',
    consumptionProfile: {
      urbanLitresPer100Km: 3.8,
      interurbanLitresPer100Km: 3,
      motorwayLitresPer100Km: 4.1,
      unknownLitresPer100Km: 3.4,
    },
  },
  alternatives: [
    buildAlternative('primary', 17_500, 1620, 1.02),
    buildAlternative('alternative-1', 14_000, 1500, 0.8),
  ],
} satisfies EstimateRouteCostResponse;

describe('RouteCostResults', () => {
  it('renders empty state', () => {
    render(<RouteCostResults result={null} />);

    expect(
      screen.getByText(
        'Enter a route and vehicle details to calculate the estimated cost.',
      ),
    ).toBeInTheDocument();
  });

  it('renders metrics, all road categories, map-safe content, and custom metadata', () => {
    render(<RouteCostResults result={result} />);

    expect(screen.getByText('17,5 km')).toBeInTheDocument();
    expect(screen.getByText('27 min')).toBeInTheDocument();
    expect(screen.getByText('0,64 L')).toBeInTheDocument();
    expect(screen.getAllByText(/1,02\s€/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Custom maxi scooter/)).toBeInTheDocument();
    expect(screen.getByText('Urban')).toBeInTheDocument();
    expect(screen.getByText('Interurban')).toBeInTheDocument();
    expect(screen.getByText('Motorway')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('switches alternatives without fetching', async () => {
    const user = userEvent.setup();
    render(<RouteCostResults result={result} />);

    await user.click(screen.getByRole('radio', { name: /Alternative 1/ }));

    expect(screen.getByText('14 km')).toBeInTheDocument();
    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getAllByText(/0,80\s€/).length).toBeGreaterThan(0);
  });
});

function buildAlternative(
  id: string,
  distanceMetres: number,
  durationSeconds: number,
  estimatedCost: number,
): EstimateRouteCostResponse['alternatives'][number] {
  return {
    id,
    distanceMetres,
    durationSeconds,
    encodedPolyline: `polyline-${id}`,
    summary: {
      urbanDistanceMetres: 7500,
      interurbanDistanceMetres: 5000,
      motorwayDistanceMetres: 5000,
      unknownDistanceMetres: 0,
    },
    segments: [],
    fuelEstimate: {
      breakdown: {
        urban: {
          distanceMetres: 7500,
          litresPer100Km: 3.8,
          estimatedLitres: 0.285,
        },
        interurban: {
          distanceMetres: 5000,
          litresPer100Km: 3,
          estimatedLitres: 0.15,
        },
        motorway: {
          distanceMetres: 5000,
          litresPer100Km: 4.1,
          estimatedLitres: 0.205,
        },
        unknown: {
          distanceMetres: 0,
          litresPer100Km: 3.4,
          estimatedLitres: 0,
        },
      },
      totalLitres: 0.64,
    },
    costEstimate: {
      fuelPrice: { amountPerLitre: 1.6, currency: 'EUR' },
      estimatedCost,
    },
  };
}
