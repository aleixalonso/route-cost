import type {
  GeoJSONSource,
  LngLatBoundsLike,
  Map as MapLibreMap,
  Marker,
} from 'maplibre-gl';
import * as maplibregl from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useMapResize } from '../hooks/use-map-resize';
import type {
  LineStringFeature,
  LineStringFeatureCollection,
} from '../lib/geojson';
import {
  ROAD_CATEGORY_STYLE,
  ROUTE_MAP_LAYER_IDS,
  ROUTE_MAP_PADDING,
  ROUTE_MAP_SOURCE_IDS,
} from '../model/route-map.constants';
import type {
  RouteMapModel,
  RouteSegmentProperties,
} from '../model/route-map-model';

interface RouteMapCanvasProps {
  readonly model: RouteMapModel;
  readonly mapStyleUrl: string;
  readonly onError: () => void;
}

const EMPTY_LINE: LineStringFeature = {
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: [] },
  properties: {},
};

const EMPTY_SEGMENTS: LineStringFeatureCollection<RouteSegmentProperties> = {
  type: 'FeatureCollection',
  features: [],
};

export function RouteMapCanvas({
  model,
  mapStyleUrl,
  onError,
}: RouteMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const originMarkerRef = useRef<Marker | null>(null);
  const destinationMarkerRef = useRef<Marker | null>(null);
  const lastFittedAlternativeRef = useRef<string | null>(null);
  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [styleReadyGeneration, setStyleReadyGeneration] = useState(0);

  const refCallback = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
    setContainerElement(element);
  }, []);

  const fitRoute = useCallback((): boolean => {
    const map = mapRef.current;
    const container = containerRef.current;

    if (map === null || container === null) {
      return false;
    }

    if (container.clientWidth === 0 || container.clientHeight === 0) {
      return false;
    }

    try {
      if (isSinglePointBounds(model.bounds)) {
        map.easeTo({
          center: [model.bounds.west, model.bounds.south],
          zoom: 14,
          duration: 0,
        });
        return true;
      }

      map.fitBounds(toLngLatBounds(model.bounds), {
        padding: getRoutePadding(container),
        duration: 0,
      });
      return true;
    } catch {
      onError();
      return false;
    }
  }, [model.bounds, onError]);

  useEffect(() => {
    const container = containerRef.current;

    if (container === null || mapRef.current !== null) {
      return;
    }

    try {
      if (!isWebGlAvailable()) {
        onError();
        return;
      }

      const map = new maplibregl.Map({
        container,
        style: mapStyleUrl,
        dragRotate: false,
        pitchWithRotate: false,
      });

      mapRef.current = map;
      setMapInstance(map);
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

      const handleStyleReady = () => {
        registerSourcesAndLayers(map);
        setStyleReadyGeneration((generation) => generation + 1);
      };
      const handleError = () => onError();

      if (map.loaded()) {
        handleStyleReady();
      }

      map.on('load', handleStyleReady);
      map.on('styledata', handleStyleReady);
      map.on('error', handleError);

      return () => {
        map.off('load', handleStyleReady);
        map.off('styledata', handleStyleReady);
        map.off('error', handleError);
        originMarkerRef.current?.remove();
        destinationMarkerRef.current?.remove();
        originMarkerRef.current = null;
        destinationMarkerRef.current = null;
        map.remove();
        mapRef.current = null;
        setMapInstance(null);
      };
    } catch {
      onError();
    }
  }, [mapStyleUrl, onError]);

  useEffect(() => {
    const map = mapRef.current;

    if (map === null) {
      return;
    }

    try {
      registerSourcesAndLayers(map);
      setGeoJsonSourceData(
        map,
        ROUTE_MAP_SOURCE_IDS.fullRoute,
        model.fullRoute,
      );
      setGeoJsonSourceData(map, ROUTE_MAP_SOURCE_IDS.segments, model.segments);
    } catch {
      onError();
    }
  }, [model.fullRoute, model.segments, onError, styleReadyGeneration]);

  useEffect(() => {
    const map = mapRef.current;

    if (map === null) {
      return;
    }

    try {
      originMarkerRef.current = updateMarker(
        map,
        originMarkerRef.current,
        model.origin,
        'A',
        'Origin',
      );
      destinationMarkerRef.current = updateMarker(
        map,
        destinationMarkerRef.current,
        model.destination,
        'B',
        'Destination',
      );
    } catch {
      onError();
    }
  }, [model.origin, model.destination, onError]);

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

function registerSourcesAndLayers(map: MapLibreMap): void {
  if (!map.isStyleLoaded()) {
    return;
  }

  if (map.getSource(ROUTE_MAP_SOURCE_IDS.fullRoute) === undefined) {
    map.addSource(ROUTE_MAP_SOURCE_IDS.fullRoute, {
      type: 'geojson',
      data: EMPTY_LINE,
    });
  }

  if (map.getSource(ROUTE_MAP_SOURCE_IDS.segments) === undefined) {
    map.addSource(ROUTE_MAP_SOURCE_IDS.segments, {
      type: 'geojson',
      data: EMPTY_SEGMENTS,
    });
  }

  if (map.getLayer(ROUTE_MAP_LAYER_IDS.casing) === undefined) {
    map.addLayer({
      id: ROUTE_MAP_LAYER_IDS.casing,
      type: 'line',
      source: ROUTE_MAP_SOURCE_IDS.fullRoute,
      paint: {
        'line-color': '#111827',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 8, 14, 12],
        'line-opacity': 0.75,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
  }

  if (map.getLayer(ROUTE_MAP_LAYER_IDS.fullRoute) === undefined) {
    map.addLayer({
      id: ROUTE_MAP_LAYER_IDS.fullRoute,
      type: 'line',
      source: ROUTE_MAP_SOURCE_IDS.fullRoute,
      paint: {
        'line-color': '#f8fafc',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 5, 14, 7],
        'line-opacity': 0.95,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
  }

  if (map.getLayer(ROUTE_MAP_LAYER_IDS.segments) === undefined) {
    map.addLayer({
      id: ROUTE_MAP_LAYER_IDS.segments,
      type: 'line',
      source: ROUTE_MAP_SOURCE_IDS.segments,
      paint: {
        'line-color': [
          'match',
          ['get', 'roadCategory'],
          'urban',
          ROAD_CATEGORY_STYLE.urban.lineColor,
          'interurban',
          ROAD_CATEGORY_STYLE.interurban.lineColor,
          'motorway',
          ROAD_CATEGORY_STYLE.motorway.lineColor,
          'unknown',
          ROAD_CATEGORY_STYLE.unknown.lineColor,
          ROAD_CATEGORY_STYLE.unknown.lineColor,
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 6],
        'line-opacity': 0.98,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
  }
}

function setGeoJsonSourceData(
  map: MapLibreMap,
  sourceId: string,
  data: LineStringFeature | LineStringFeatureCollection<RouteSegmentProperties>,
): void {
  const source = map.getSource(sourceId);

  if (source === undefined || !('setData' in source)) {
    return;
  }

  void (source as GeoJSONSource).setData(
    data as Parameters<GeoJSONSource['setData']>[0],
  );
}

function updateMarker(
  map: MapLibreMap,
  marker: Marker | null,
  coordinate: { readonly latitude: number; readonly longitude: number },
  label: string,
  title: string,
): Marker {
  if (marker !== null) {
    marker.setLngLat([coordinate.longitude, coordinate.latitude]);
    return marker;
  }

  return new maplibregl.Marker({
    element: createMarkerElement(label, title),
    anchor: 'center',
  })
    .setLngLat([coordinate.longitude, coordinate.latitude])
    .addTo(map);
}

function createMarkerElement(label: string, title: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className =
    'grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-950 text-xs font-bold text-white shadow-md';
  element.textContent = label;
  element.title = title;
  element.setAttribute('aria-hidden', 'true');
  element.dataset.testid = `route-map-marker-${label.toLowerCase()}`;

  return element;
}

function toLngLatBounds(bounds: {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}): LngLatBoundsLike {
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.north],
  ];
}

function isSinglePointBounds(bounds: {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}): boolean {
  return bounds.west === bounds.east && bounds.south === bounds.north;
}

function getRoutePadding(container: HTMLElement | null) {
  return container !== null && container.clientWidth >= 768
    ? ROUTE_MAP_PADDING.desktop
    : ROUTE_MAP_PADDING.mobile;
}

function isWebGlAvailable(): boolean {
  const canvas = document.createElement('canvas');

  return (
    canvas.getContext('webgl') !== null ||
    canvas.getContext('experimental-webgl') !== null
  );
}
