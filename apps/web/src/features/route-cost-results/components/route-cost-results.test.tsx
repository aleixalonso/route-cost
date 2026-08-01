import type { EstimateRouteCostResponse } from '@route-cost/contracts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RouteCostResults } from './route-cost-results';

vi.mock('../../route-map', () => ({
  RouteMap: ({
    alternative,
  }: {
    readonly alternative: EstimateRouteCostResponse['alternatives'][number];
  }) => <section aria-label="Route map">Map {alternative.id}</section>,
}));

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
  routePreferences: {
    avoidTolls: false,
    avoidMotorways: false,
    avoidFerries: false,
    priority: 'fastest',
  },
  alternatives: [
    buildAlternative('primary', 17_500, 1620, 1.02, {
      tolls: known(true, 4_200, 1),
      motorways: known(true, 5_000, 1),
      ferries: known(false, 0, 0),
    }),
    buildAlternative('alternative-1', 14_000, 1500, 0.8, {
      tolls: known(false, 0, 0),
      motorways: known(true, 4_000, 1),
      ferries: known(false, 0, 0),
    }),
  ],
} satisfies EstimateRouteCostResponse;

const routeLocations = {
  origin: {
    id: 'origin',
    label: 'Plaça de Catalunya',
    coordinate: { latitude: 41.387, longitude: 2.17 },
  },
  destination: {
    id: 'destination',
    label: 'Sagrada Família',
    coordinate: { latitude: 41.4036, longitude: 2.1744 },
  },
};

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
    render(
      <RouteCostResults result={result} routeLocations={routeLocations} />,
    );

    expect(screen.getByText('Map primary')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Alternative 1/ }));

    expect(screen.getByText('14 km')).toBeInTheDocument();
    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getAllByText(/0,80\s€/).length).toBeGreaterThan(0);
    expect(screen.getByText('Map alternative-1')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Alternative 1/ })).toHaveFocus();
  });

  it('labels alternatives with observed characteristics', () => {
    render(<RouteCostResults result={result} />);

    expect(
      screen.getByRole('radio', {
        name: /Fastest\. 27 min · 17,5 km · Tolls · Motorways · No ferries/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', {
        name: /Alternative 1\. 25 min · 14 km · No tolls · Motorways · No ferries/,
      }),
    ).toBeInTheDocument();
  });

  it('renders the selected route characteristics with distances', () => {
    render(<RouteCostResults result={result} />);

    expect(screen.getByText('Route characteristics')).toBeInTheDocument();
    expect(screen.getByText('Includes tolls')).toBeInTheDocument();
    expect(screen.getByText('4,2 km')).toBeInTheDocument();
    expect(screen.getByText('Includes motorways')).toBeInTheDocument();
    expect(screen.getByText('No ferries')).toBeInTheDocument();
  });

  it('updates characteristics when switching alternatives', async () => {
    const user = userEvent.setup();
    render(<RouteCostResults result={result} />);

    await user.click(screen.getByRole('radio', { name: /Alternative 1/ }));

    expect(screen.getByText('No tolls')).toBeInTheDocument();
    expect(screen.getByText('Includes motorways')).toBeInTheDocument();
    expect(screen.getByText('No ferries')).toBeInTheDocument();
  });

  it('renders one grouped conflict warning when an avoidance cannot be satisfied', () => {
    const conflicting = buildConflictResult(['tolls-present']);

    render(<RouteCostResults result={conflicting} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'You asked to avoid toll roads, but this route still includes 4,2 km of toll roads.',
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('renders multiple conflicts in one grouped warning', () => {
    const conflicting = buildConflictResult([
      'tolls-present',
      'motorways-present',
    ]);

    render(<RouteCostResults result={conflicting} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'You asked to avoid toll roads, but this route still includes 4,2 km of toll roads. You asked to avoid motorways, but this route still includes motorway sections.',
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('shows no conflict warning when the preference is disabled', () => {
    render(<RouteCostResults result={result} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/You asked to avoid/)).not.toBeInTheDocument();
  });

  it('renders an accessible stale-preferences warning', () => {
    render(<RouteCostResults result={result} isPreferencesStale />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Route preferences have changed. Recalculate to update the route.',
    );
  });

  it('never shows a monetary toll amount', () => {
    const { container } = render(<RouteCostResults result={result} />);

    expect(screen.queryByText(/Tolls:\s*€/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0\s*€.*toll/i)).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('€0');
  });

  it('renders unknown detection safely without claiming absence', () => {
    const unknownResult = {
      ...result,
      alternatives: [
        buildAlternative('primary', 17_500, 1620, 1.02, {
          tolls: { status: 'unknown' },
          motorways: known(false, 0, 0),
          ferries: known(false, 0, 0),
        }),
      ],
    } satisfies EstimateRouteCostResponse;

    render(<RouteCostResults result={unknownResult} />);

    expect(screen.getByText('Tolls unknown')).toBeInTheDocument();
    expect(screen.getByText('No motorways')).toBeInTheDocument();
  });

  it('places the map between estimate metrics and vehicle profile', () => {
    render(
      <RouteCostResults result={result} routeLocations={routeLocations} />,
    );

    const costMetric = screen.getByText('Estimated cost').closest('div');
    const map = screen.getByRole('region', { name: 'Route map' });
    const vehicleHeading = screen.getByRole('heading', {
      name: 'Vehicle profile',
    });

    if (costMetric === null) {
      throw new Error('Estimated cost metric was not rendered.');
    }

    expect(
      costMetric.compareDocumentPosition(map) &
        globalThis.Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      map.compareDocumentPosition(vehicleHeading) &
        globalThis.Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

function buildConflictResult(
  conflicts: readonly (
    'tolls-present' | 'motorways-present' | 'ferries-present'
  )[],
): EstimateRouteCostResponse {
  return {
    ...result,
    routePreferences: {
      avoidTolls: true,
      avoidMotorways: true,
      avoidFerries: true,
      priority: 'fastest',
    },
    alternatives: [
      buildAlternative('primary', 17_500, 1620, 1.02, {
        tolls: known(true, 4_200, 1),
        motorways: known(true, 5_000, 1),
        ferries: known(false, 0, 0),
      }),
    ].map((alternative) => ({
      ...alternative,
      preferenceCompliance: { conflicts },
    })),
  };
}

function buildAlternative(
  id: string,
  distanceMetres: number,
  durationSeconds: number,
  estimatedCost: number,
  routeCharacteristics: EstimateRouteCostResponse['alternatives'][number]['routeCharacteristics'],
): EstimateRouteCostResponse['alternatives'][number] {
  return {
    id,
    distanceMetres,
    durationSeconds,
    encodedPolyline:
      id === 'primary' ? 'o~`}mA_hmcC_sN_|BoxO_uC' : 'o~`}mA_hmcCozDo}@_qYosE',
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
    routeCharacteristics,
    preferenceCompliance: { conflicts: [] },
  };
}

function known(
  present: boolean,
  distanceMetres: number,
  segmentCount: number,
): EstimateRouteCostResponse['alternatives'][number]['routeCharacteristics']['tolls'] {
  return { status: 'known', present, distanceMetres, segmentCount };
}
