import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/render';
import { RouteEstimatorPage } from './route-estimator-page';

vi.mock('../../features/route-map', () => ({
  RouteMap: () => (
    <section aria-label="Route map">Route map test double</section>
  ),
}));

const vehiclesResponse = {
  items: [
    {
      id: 'honda-forza-350-2025',
      manufacturer: 'Honda',
      model: 'Forza',
      variant: '350',
      displayName: 'Honda Forza 350',
      yearFrom: 2025,
      vehicleCategory: 'maxi-scooter',
      fuelType: 'petrol',
      powertrainType: 'internal-combustion',
      consumptionProfile: {
        urbanLitresPer100Km: 3.8,
        interurbanLitresPer100Km: 3,
        motorwayLitresPer100Km: 4.1,
        unknownLitresPer100Km: 3.4,
      },
      consumptionData: { status: 'estimated', confidence: 'medium' },
    },
  ],
  total: 1,
};

const routeCostResponse = {
  vehicle: {
    source: 'catalog',
    vehicleId: 'honda-forza-350-2025',
    displayName: 'Honda Forza 350',
    vehicleCategory: 'maxi-scooter',
    fuelType: 'petrol',
    powertrainType: 'internal-combustion',
    consumptionProfile: {
      urbanLitresPer100Km: 3.8,
      interurbanLitresPer100Km: 3,
      motorwayLitresPer100Km: 4.1,
      unknownLitresPer100Km: 3.4,
    },
    consumptionData: { status: 'estimated', confidence: 'medium' },
  },
  routePreferences: {
    avoidTolls: false,
    avoidMotorways: false,
    avoidFerries: false,
    priority: 'fastest',
  },
  alternatives: [
    {
      id: 'primary',
      distanceMetres: 17_500,
      durationSeconds: 1620,
      encodedPolyline: 'o~`}mA_hmcC_sN_|BoxO_uC',
      summary: {
        urbanDistanceMetres: 7500,
        interurbanDistanceMetres: 5000,
        motorwayDistanceMetres: 5000,
        unknownDistanceMetres: 0,
      },
      segments: [
        {
          distanceMetres: 7500,
          beginShapeIndex: 0,
          endShapeIndex: 1,
          roadCategory: 'urban',
          classificationReason: 'urban-density',
          isToll: false,
          isFerry: false,
        },
        {
          distanceMetres: 5000,
          beginShapeIndex: 1,
          endShapeIndex: 2,
          roadCategory: 'motorway',
          classificationReason: 'road-class-motorway',
          isToll: true,
          isFerry: false,
        },
      ],
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
        estimatedCost: 1.024,
      },
      routeCharacteristics: {
        tolls: {
          status: 'known',
          present: true,
          distanceMetres: 5000,
          segmentCount: 1,
        },
        motorways: {
          status: 'known',
          present: true,
          distanceMetres: 5000,
          segmentCount: 1,
        },
        ferries: {
          status: 'known',
          present: false,
          distanceMetres: 0,
          segmentCount: 0,
        },
      },
      preferenceCompliance: { conflicts: [] },
    },
  ],
};

describe('RouteEstimatorPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows validation errors before submission', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(vehiclesResponse),
    );
    const user = userEvent.setup();

    renderWithProviders(<RouteEstimatorPage />);

    await user.click(screen.getByRole('button', { name: 'Calculate route' }));

    expect(screen.getByText('Choose a resolved origin.')).toBeInTheDocument();
    expect(
      screen.getByText('Choose a resolved destination.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Choose a catalog vehicle or custom vehicle.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Enter a positive fuel price.'),
    ).toBeInTheDocument();
  });

  it('submits catalog mode and renders the estimate', async () => {
    const requests: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = new URL(getRequestUrl(input), 'http://localhost');
      if (url.pathname === '/api/v1/vehicles') {
        return Response.json(vehiclesResponse);
      }
      if (url.pathname === '/api/v1/locations/autocomplete') {
        return Response.json({
          items: [
            {
              id: url.searchParams.get('query')?.startsWith('Sag')
                ? 'mock:sagrada-familia'
                : 'mock:placa-catalunya',
              primaryText: url.searchParams.get('query')?.startsWith('Sag')
                ? 'Sagrada Família'
                : 'Plaça de Catalunya',
              secondaryText: 'Barcelona',
              type: 'point-of-interest',
              precision: 'point',
            },
          ],
          attribution: { url: 'https://stadiamaps.com/attribution/' },
        });
      }
      if (url.pathname === '/api/v1/locations/details') {
        const isDestination =
          url.searchParams.get('placeId') === 'mock:sagrada-familia';
        return Response.json({
          location: {
            id: isDestination ? 'mock:sagrada-familia' : 'mock:placa-catalunya',
            name: isDestination ? 'Sagrada Família' : 'Plaça de Catalunya',
            label: isDestination
              ? 'Sagrada Família, Barcelona, Catalunya, España'
              : 'Plaça de Catalunya, Barcelona, Catalunya, España',
            coordinate: isDestination
              ? { latitude: 41.4036, longitude: 2.1744 }
              : { latitude: 41.387, longitude: 2.17 },
            type: 'point-of-interest',
            precision: 'point',
          },
          attribution: { url: 'https://stadiamaps.com/attribution/' },
        });
      }
      if (url.pathname === '/api/v1/route-cost-estimates') {
        requests.push(JSON.parse(getRequestBody(init)) as unknown);
        return Response.json(routeCostResponse);
      }
      return new Response(null, { status: 404 });
    });
    const user = userEvent.setup();

    renderWithProviders(<RouteEstimatorPage />);

    await user.type(screen.getByLabelText('Origin'), 'Pla');
    await user.click(
      await screen.findByRole('button', { name: /Plaça de Catalunya/ }),
    );
    await user.type(screen.getByLabelText('Destination'), 'Sag');
    await user.click(
      await screen.findByRole('button', { name: /Sagrada Família/ }),
    );
    await user.selectOptions(
      screen.getByLabelText('Vehicle'),
      'honda-forza-350-2025',
    );
    await user.type(screen.getByLabelText('Fuel price'), '1.6');
    await user.click(screen.getByRole('button', { name: 'Calculate route' }));

    await waitFor(() =>
      expect(screen.getByText('17,5 km')).toBeInTheDocument(),
    );
    expect(screen.getByText('27 min')).toBeInTheDocument();
    expect(screen.getByText('0,64 L')).toBeInTheDocument();
    expect(screen.getByText(/1,02\s€/)).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(requests[0]).toMatchObject({
      vehicleId: 'honda-forza-350-2025',
      fuelPrice: { amountPerLitre: 1.6, currency: 'EUR' },
      routePreferences: {
        avoidTolls: false,
        avoidMotorways: false,
        avoidFerries: false,
        priority: 'fastest',
      },
    });
    expect(requests[0]).not.toHaveProperty('consumptionProfile');
  }, 10_000);

  it('renders default preference controls: fastest and no avoidance', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(vehiclesResponse),
    );

    renderWithProviders(<RouteEstimatorPage />);

    expect(
      screen.getByRole('group', { name: 'Route preferences' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Fastest' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Shortest' })).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Avoid toll roads' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Avoid motorways' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Avoid ferries' }),
    ).not.toBeChecked();
  });

  it('selects shortest and includes it in the submitted request', async () => {
    const requests: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      buildMockFetch((body) => {
        requests.push(body);
        return routeCostResponse;
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<RouteEstimatorPage />);

    await fillValidRoute(user);
    await user.click(screen.getByRole('radio', { name: 'Shortest' }));
    await user.click(
      screen.getByRole('checkbox', { name: 'Avoid toll roads' }),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Avoid motorways' }));
    await user.click(screen.getByRole('checkbox', { name: 'Avoid ferries' }));
    await user.click(screen.getByRole('button', { name: 'Calculate route' }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({
      routePreferences: {
        avoidTolls: true,
        avoidMotorways: true,
        avoidFerries: true,
        priority: 'shortest',
      },
    });
  }, 10_000);

  it('marks the previous result stale when preferences change without resubmitting', async () => {
    let routeCostCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      buildMockFetch(() => {
        routeCostCalls += 1;
        return routeCostResponse;
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<RouteEstimatorPage />);

    await fillValidRoute(user);
    await user.click(screen.getByRole('button', { name: 'Calculate route' }));

    await waitFor(() =>
      expect(screen.getByText('17,5 km')).toBeInTheDocument(),
    );
    expect(routeCostCalls).toBe(1);

    await user.click(
      screen.getByRole('checkbox', { name: 'Avoid toll roads' }),
    );

    expect(routeCostCalls).toBe(1);
    expect(
      screen.getByText(
        'Route preferences have changed. Recalculate to update the route.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Calculate route' }));

    await waitFor(() => expect(routeCostCalls).toBe(2));
    expect(
      screen.queryByText(
        'Route preferences have changed. Recalculate to update the route.',
      ),
    ).not.toBeInTheDocument();
  }, 10_000);
});

async function fillValidRoute(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Origin'), 'Pla');
  await user.click(
    await screen.findByRole('button', { name: /Plaça de Catalunya/ }),
  );
  await user.type(screen.getByLabelText('Destination'), 'Sag');
  await user.click(
    await screen.findByRole('button', { name: /Sagrada Família/ }),
  );
  await user.selectOptions(
    screen.getByLabelText('Vehicle'),
    'honda-forza-350-2025',
  );
  await user.type(screen.getByLabelText('Fuel price'), '1.6');
}

function buildMockFetch(
  onRouteCost: (body: unknown) => typeof routeCostResponse,
) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(getRequestUrl(input), 'http://localhost');
    if (url.pathname === '/api/v1/vehicles') {
      return Response.json(vehiclesResponse);
    }
    if (url.pathname === '/api/v1/locations/autocomplete') {
      return Response.json({
        items: [
          {
            id: url.searchParams.get('query')?.startsWith('Sag')
              ? 'mock:sagrada-familia'
              : 'mock:placa-catalunya',
            primaryText: url.searchParams.get('query')?.startsWith('Sag')
              ? 'Sagrada Família'
              : 'Plaça de Catalunya',
            secondaryText: 'Barcelona',
            type: 'point-of-interest',
            precision: 'point',
          },
        ],
        attribution: { url: 'https://stadiamaps.com/attribution/' },
      });
    }
    if (url.pathname === '/api/v1/locations/details') {
      const isDestination =
        url.searchParams.get('placeId') === 'mock:sagrada-familia';
      return Response.json({
        location: {
          id: isDestination ? 'mock:sagrada-familia' : 'mock:placa-catalunya',
          name: isDestination ? 'Sagrada Família' : 'Plaça de Catalunya',
          label: isDestination
            ? 'Sagrada Família, Barcelona, Catalunya, España'
            : 'Plaça de Catalunya, Barcelona, Catalunya, España',
          coordinate: isDestination
            ? { latitude: 41.4036, longitude: 2.1744 }
            : { latitude: 41.387, longitude: 2.17 },
          type: 'point-of-interest',
          precision: 'point',
        },
        attribution: { url: 'https://stadiamaps.com/attribution/' },
      });
    }
    if (url.pathname === '/api/v1/route-cost-estimates') {
      const body = JSON.parse(getRequestBody(init)) as unknown;
      const requestPreferences = (
        body as { routePreferences?: typeof routeCostResponse.routePreferences }
      ).routePreferences;

      return Response.json({
        ...onRouteCost(body),
        ...(requestPreferences === undefined
          ? {}
          : { routePreferences: requestPreferences }),
      });
    }
    return new Response(null, { status: 404 });
  };
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (input instanceof Request) {
    return input.url;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input;
}

function getRequestBody(init: RequestInit | undefined): string {
  return typeof init?.body === 'string' ? init.body : '';
}
