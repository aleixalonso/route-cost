import type { EstimateRouteCostResponse } from '@route-cost/contracts';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SelectedLocation } from '../../location-search';
import { RouteMap } from './route-map';

const mockSetData = vi.fn();
const mockResize = vi.fn();
const mockFitBounds = vi.fn();
const mockEaseTo = vi.fn();
const mockRemoveMap = vi.fn();
const mockAddSource = vi.fn();
const mockAddLayer = vi.fn();
const mockMarkerRemove = vi.fn();
const mockMarkerSetLngLat = vi.fn();
const mockMarkerAddTo = vi.fn();
const mapInstances: object[] = [];
const markerInstances: object[] = [];
let constructorThrows = false;
let mapStartsLoaded = true;
let loadHandler: (() => void) | null = null;

vi.mock('maplibre-gl', () => {
  class MockMap {
    public readonly sources = new Map<
      string,
      { setData: typeof mockSetData }
    >();
    public readonly layers = new Set<string>();

    public constructor() {
      if (constructorThrows) {
        throw new Error('WebGL unavailable');
      }
      mapInstances.push(this);
    }

    public addControl() {}

    public loaded() {
      return mapStartsLoaded;
    }

    public isStyleLoaded() {
      return mapStartsLoaded;
    }

    public on(event: string, handler: () => void) {
      if (event === 'load') {
        loadHandler = handler;
      }
    }

    public off() {}

    public getSource(id: string) {
      return this.sources.get(id);
    }

    public addSource(id: string) {
      const source = { setData: mockSetData };
      this.sources.set(id, source);
      mockAddSource(id);
    }

    public getLayer(id: string) {
      return this.layers.has(id) ? { id } : undefined;
    }

    public addLayer(layer: { readonly id: string }) {
      this.layers.add(layer.id);
      mockAddLayer(layer.id);
    }

    public fitBounds = mockFitBounds;
    public easeTo = mockEaseTo;
    public resize = mockResize;
    public remove = mockRemoveMap;
  }

  class MockMarker {
    public constructor() {
      markerInstances.push(this);
    }

    public addTo() {
      mockMarkerAddTo();
      return this;
    }

    public setLngLat(coordinate: readonly [number, number]) {
      mockMarkerSetLngLat(coordinate);
      return this;
    }

    public remove = mockMarkerRemove;
  }

  return {
    Map: MockMap,
    Marker: MockMarker,
    NavigationControl: class MockNavigationControl {},
  };
});

class MockResizeObserver {
  public constructor(private readonly callback: ResizeObserverCallback) {}

  public observe() {
    this.callback([], this);
  }

  public disconnect() {}

  public unobserve() {}
}

describe('RouteMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapInstances.length = 0;
    markerInstances.length = 0;
    constructorThrows = false;
    mapStartsLoaded = true;
    loadHandler = null;
    globalThis.ResizeObserver = MockResizeObserver;
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(320);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as RenderingContext,
    );
  });

  it('initializes MapLibre once, registers route sources/layers, markers, and bounds', async () => {
    render(
      <RouteMap
        origin={origin}
        destination={destination}
        alternative={buildAlternative('primary', BARCELONA_ROUTE)}
      />,
    );

    await waitFor(() => expect(mapInstances).toHaveLength(1));

    expect(mockAddSource).toHaveBeenCalledWith('route-full-source');
    expect(mockAddSource).toHaveBeenCalledWith('route-segments-source');
    expect(mockAddLayer).toHaveBeenCalledWith('route-casing-layer');
    expect(mockAddLayer).toHaveBeenCalledWith('route-full-layer');
    expect(mockAddLayer).toHaveBeenCalledWith('route-segments-layer');
    expect(markerInstances).toHaveLength(2);
    expect(mockMarkerSetLngLat).toHaveBeenCalledWith([2.17, 41.387]);
    expect(mockMarkerSetLngLat).toHaveBeenCalledWith([2.1744, 41.4036]);
    expect(mockFitBounds).toHaveBeenCalled();
    expect(screen.getByRole('region', { name: /Map showing/ })).toBeVisible();
    expect(screen.getByText('Urban')).toBeInTheDocument();
    expect(screen.getByText('Interurban not present')).toBeInTheDocument();
  });

  it('waits for style readiness before fitting the route', async () => {
    mapStartsLoaded = false;

    render(
      <RouteMap
        origin={origin}
        destination={destination}
        alternative={buildAlternative('primary', BARCELONA_ROUTE)}
      />,
    );

    await waitFor(() => expect(mapInstances).toHaveLength(1));
    expect(mockFitBounds).not.toHaveBeenCalled();

    mapStartsLoaded = true;
    loadHandler?.();

    await waitFor(() => expect(mockFitBounds).toHaveBeenCalled());
  });

  it('rerenders and switches alternatives through source setData without a new map', async () => {
    const { rerender } = render(
      <RouteMap
        origin={origin}
        destination={destination}
        alternative={buildAlternative('primary', BARCELONA_ROUTE)}
      />,
    );

    await waitFor(() => expect(mapInstances).toHaveLength(1));
    mockSetData.mockClear();

    rerender(
      <RouteMap
        origin={origin}
        destination={destination}
        alternative={buildAlternative('alternative-1', SECOND_ROUTE)}
      />,
    );

    await waitFor(() => expect(mockSetData).toHaveBeenCalled());
    expect(mapInstances).toHaveLength(1);
    expect(mockFitBounds).toHaveBeenCalledTimes(2);
  });

  it('keeps keyboard focus on an external radio while map updates', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [alternative, setAlternative] = useStateAlternative('primary');

      return (
        <>
          <label>
            <input
              type="radio"
              name="alternative"
              checked={alternative.id === 'primary'}
              onChange={() => setAlternative('primary')}
            />
            Fastest route
          </label>
          <label>
            <input
              type="radio"
              name="alternative"
              checked={alternative.id === 'alternative-1'}
              onChange={() => setAlternative('alternative-1')}
            />
            Alternative 1
          </label>
          <RouteMap
            origin={origin}
            destination={destination}
            alternative={alternative}
          />
        </>
      );
    }

    render(<Harness />);
    const alternativeRadio = screen.getByRole('radio', {
      name: 'Alternative 1',
    });
    await user.click(alternativeRadio);

    expect(alternativeRadio).toHaveFocus();
    expect(mapInstances).toHaveLength(1);
  });

  it('calls resize and removes map and markers on cleanup', async () => {
    const { unmount } = render(
      <RouteMap
        origin={origin}
        destination={destination}
        alternative={buildAlternative('primary', BARCELONA_ROUTE)}
      />,
    );

    await waitFor(() => expect(mockResize).toHaveBeenCalled());
    unmount();

    expect(mockRemoveMap).toHaveBeenCalled();
    expect(mockMarkerRemove).toHaveBeenCalledTimes(2);
  });

  it('renders accessible fallback for initialization, WebGL, or geometry failure', async () => {
    constructorThrows = true;

    render(
      <RouteMap
        origin={origin}
        destination={destination}
        alternative={buildAlternative('primary', BARCELONA_ROUTE)}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'map could not be displayed',
    );

    constructorThrows = false;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(
      <RouteMap
        origin={origin}
        destination={destination}
        alternative={buildAlternative('primary', BARCELONA_ROUTE)}
      />,
    );

    expect(await screen.findAllByRole('alert')).toHaveLength(2);

    render(
      <RouteMap
        origin={origin}
        destination={destination}
        alternative={buildAlternative('primary', 'bad')}
      />,
    );

    expect(await screen.findAllByRole('alert')).toHaveLength(3);
  });

  it('announces updating state and composes className without margins', () => {
    render(
      <RouteMap
        origin={origin}
        destination={destination}
        alternative={buildAlternative('primary', BARCELONA_ROUTE)}
        isUpdating
        className="min-h-[20rem]"
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Updating route map...',
    );
    expect(screen.getByRole('heading', { name: 'Route map' })).toBeVisible();
  });
});

function useStateAlternative(initialId: 'primary' | 'alternative-1') {
  const [id, setId] = useState(initialId);

  return [
    buildAlternative(id, id === 'primary' ? BARCELONA_ROUTE : SECOND_ROUTE),
    setId,
  ] as const;
}

const BARCELONA_ROUTE = 'o~`}mA_hmcC_sN_|BoxO_uC';
const SECOND_ROUTE = 'o~`}mA_hmcCozDo}@_qYosE';

const origin = {
  id: 'origin',
  label: 'Plaça de Catalunya',
  coordinate: { latitude: 41.387, longitude: 2.17 },
} satisfies SelectedLocation;

const destination = {
  id: 'destination',
  label: 'Sagrada Família',
  coordinate: { latitude: 41.4036, longitude: 2.1744 },
} satisfies SelectedLocation;

function buildAlternative(
  id: string,
  encodedPolyline: string,
): EstimateRouteCostResponse['alternatives'][number] {
  return {
    id,
    distanceMetres: id === 'primary' ? 17_500 : 14_000,
    durationSeconds: id === 'primary' ? 1620 : 1500,
    encodedPolyline,
    summary: {
      urbanDistanceMetres: 7500,
      interurbanDistanceMetres: 0,
      motorwayDistanceMetres: 5000,
      unknownDistanceMetres: 5000,
    },
    segments: [
      {
        distanceMetres: 7500,
        beginShapeIndex: 0,
        endShapeIndex: 1,
        roadCategory: 'urban',
        classificationReason: 'urban-density',
      },
      {
        distanceMetres: 5000,
        beginShapeIndex: 1,
        endShapeIndex: 2,
        roadCategory: id === 'primary' ? 'motorway' : 'unknown',
        classificationReason:
          id === 'primary' ? 'road-class-motorway' : 'insufficient-data',
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
          distanceMetres: 0,
          litresPer100Km: 3,
          estimatedLitres: 0,
        },
        motorway: {
          distanceMetres: 5000,
          litresPer100Km: 4.1,
          estimatedLitres: 0.205,
        },
        unknown: {
          distanceMetres: 5000,
          litresPer100Km: 3.4,
          estimatedLitres: 0.17,
        },
      },
      totalLitres: 0.66,
    },
    costEstimate: {
      fuelPrice: { amountPerLitre: 1.6, currency: 'EUR' },
      estimatedCost: 1.02,
    },
  };
}
