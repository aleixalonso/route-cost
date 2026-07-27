import { useCallback, useEffect, useRef, useState } from 'react';

import { useMapResize } from '../hooks/use-map-resize';
import { MapLibreRouteAdapter } from '../lib/maplibre-route-adapter';
import type { RouteMapModel } from '../model/route-map-model';

interface RouteMapCanvasProps {
  readonly model: RouteMapModel;
  readonly mapStyleUrl: string;
  readonly onError: () => void;
}

export function RouteMapCanvas({
  model,
  mapStyleUrl,
  onError,
}: RouteMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const adapterRef = useRef<MapLibreRouteAdapter | null>(null);
  const lastFittedAlternativeRef = useRef<string | null>(null);
  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [mapInstance, setMapInstance] = useState<
    MapLibreRouteAdapter['map'] | null
  >(null);
  const [styleReadyGeneration, setStyleReadyGeneration] = useState(0);

  const refCallback = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
    setContainerElement(element);
  }, []);

  const fitRoute = useCallback((): boolean => {
    const adapter = adapterRef.current;
    const container = containerRef.current;

    if (adapter === null || container === null) {
      return false;
    }

    try {
      return adapter.fitRoute(model, container);
    } catch {
      onError();
      return false;
    }
  }, [model, onError]);

  useEffect(() => {
    const container = containerRef.current;

    if (container === null || adapterRef.current !== null) {
      return;
    }

    try {
      const adapter = new MapLibreRouteAdapter({
        container,
        mapStyleUrl,
        onStyleReady: () =>
          setStyleReadyGeneration((generation) => generation + 1),
        onError,
      });

      adapterRef.current = adapter;
      setMapInstance(adapter.map);

      return () => {
        adapter.remove();
        adapterRef.current = null;
        setMapInstance(null);
      };
    } catch {
      onError();
    }
  }, [mapStyleUrl, onError]);

  useEffect(() => {
    const adapter = adapterRef.current;

    if (adapter === null) {
      return;
    }

    try {
      adapter.updateRoute(model);
    } catch {
      onError();
    }
  }, [model, onError, styleReadyGeneration]);

  useEffect(() => {
    const adapter = adapterRef.current;

    if (adapter === null) {
      return;
    }

    try {
      adapter.updateMarkers(model);
    } catch {
      onError();
    }
  }, [model, onError]);

  useEffect(() => {
    if (styleReadyGeneration === 0) {
      return;
    }

    if (lastFittedAlternativeRef.current === model.alternativeId) {
      return;
    }

    if (fitRoute()) {
      lastFittedAlternativeRef.current = model.alternativeId;
    }
  }, [fitRoute, model.alternativeId, styleReadyGeneration]);

  useMapResize(containerElement, mapInstance, () => {
    if (lastFittedAlternativeRef.current === null) {
      fitRoute();
    }
  });

  return (
    <div
      ref={refCallback}
      className="h-full min-h-[18rem] w-full"
      data-route-alternative-id={model.alternativeId}
      data-testid="route-map-canvas"
    />
  );
}
