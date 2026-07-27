import type {
  GeoJSONSource,
  LngLatBoundsLike,
  Map as MapLibreMap,
  Marker,
} from 'maplibre-gl';
import * as maplibregl from 'maplibre-gl';

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
import type { LineStringFeature, LineStringFeatureCollection } from './geojson';

interface MapLibreRouteAdapterOptions {
  readonly container: HTMLElement;
  readonly mapStyleUrl: string;
  readonly onStyleReady: () => void;
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

export class MapLibreRouteAdapter {
  public readonly map: MapLibreMap;

  private originMarker: Marker | null = null;
  private destinationMarker: Marker | null = null;

  private readonly handleStyleReady: () => void;
  private readonly handleError: () => void;

  public constructor({
    container,
    mapStyleUrl,
    onStyleReady,
    onError,
  }: MapLibreRouteAdapterOptions) {
    if (!isWebGlAvailable()) {
      throw new Error('WebGL is not available.');
    }

    this.map = new maplibregl.Map({
      container,
      style: mapStyleUrl,
      dragRotate: false,
      pitchWithRotate: false,
    });
    this.handleStyleReady = () => {
      this.registerSourcesAndLayers();
      onStyleReady();
    };
    this.handleError = () => onError();

    this.map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
    );

    if (this.map.loaded()) {
      this.handleStyleReady();
    }

    this.map.on('load', this.handleStyleReady);
    this.map.on('styledata', this.handleStyleReady);
    this.map.on('error', this.handleError);
  }

  public updateRoute(model: RouteMapModel): void {
    this.registerSourcesAndLayers();
    setGeoJsonSourceData(
      this.map,
      ROUTE_MAP_SOURCE_IDS.fullRoute,
      model.fullRoute,
    );
    setGeoJsonSourceData(
      this.map,
      ROUTE_MAP_SOURCE_IDS.segments,
      model.segments,
    );
  }

  public updateMarkers(model: RouteMapModel): void {
    this.originMarker = updateMarker(
      this.map,
      this.originMarker,
      model.origin,
      'A',
      'Origin',
    );
    this.destinationMarker = updateMarker(
      this.map,
      this.destinationMarker,
      model.destination,
      'B',
      'Destination',
    );
  }

  public fitRoute(model: RouteMapModel, container: HTMLElement): boolean {
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      return false;
    }

    if (isSinglePointBounds(model.bounds)) {
      this.map.easeTo({
        center: [model.bounds.west, model.bounds.south],
        zoom: 14,
        duration: 0,
      });
      return true;
    }

    this.map.fitBounds(toLngLatBounds(model.bounds), {
      padding: getRoutePadding(container),
      duration: 0,
    });
    return true;
  }

  public remove(): void {
    this.map.off('load', this.handleStyleReady);
    this.map.off('styledata', this.handleStyleReady);
    this.map.off('error', this.handleError);
    this.originMarker?.remove();
    this.destinationMarker?.remove();
    this.originMarker = null;
    this.destinationMarker = null;
    this.map.remove();
  }

  private registerSourcesAndLayers(): void {
    if (!this.map.isStyleLoaded()) {
      return;
    }

    if (this.map.getSource(ROUTE_MAP_SOURCE_IDS.fullRoute) === undefined) {
      this.map.addSource(ROUTE_MAP_SOURCE_IDS.fullRoute, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }

    if (this.map.getSource(ROUTE_MAP_SOURCE_IDS.segments) === undefined) {
      this.map.addSource(ROUTE_MAP_SOURCE_IDS.segments, {
        type: 'geojson',
        data: EMPTY_SEGMENTS,
      });
    }

    if (this.map.getLayer(ROUTE_MAP_LAYER_IDS.casing) === undefined) {
      this.map.addLayer({
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

    if (this.map.getLayer(ROUTE_MAP_LAYER_IDS.fullRoute) === undefined) {
      this.map.addLayer({
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

    if (this.map.getLayer(ROUTE_MAP_LAYER_IDS.segments) === undefined) {
      this.map.addLayer({
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

function getRoutePadding(container: HTMLElement) {
  return container.clientWidth >= 768
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
