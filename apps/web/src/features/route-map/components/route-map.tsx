import { useCallback, useId, useMemo, useState } from 'react';

import { clientEnvironment } from '../../../lib/env';
import { formatDistanceMetres } from '../../../shared/lib/format-distance';
import { formatDurationSeconds } from '../../../shared/lib/format-duration';
import type { SelectedLocation } from '../../location-search';
import { buildRouteMapModel } from '../lib/build-route-map-model';
import { ROAD_CATEGORY_STYLE } from '../model/route-map.constants';
import type {
  RouteCostAlternative,
  RouteMapModel,
} from '../model/route-map-model';
import { RouteMapCanvas } from './route-map-canvas';
import { RouteMapFallback } from './route-map-fallback';
import { RouteMapLegend } from './route-map-legend';

export interface RouteMapProps {
  readonly origin: SelectedLocation;
  readonly destination: SelectedLocation;
  readonly alternative: RouteCostAlternative;
  readonly isUpdating?: boolean;
  readonly className?: string;
}

export function RouteMap({
  origin,
  destination,
  alternative,
  isUpdating = false,
  className = '',
}: RouteMapProps) {
  const headingId = useId();
  const [errorGeneration, setErrorGeneration] = useState(0);
  const [mapError, setMapError] = useState(false);
  const handleMapError = useCallback(() => setMapError(true), []);

  const model = useMemo<RouteMapModel | null>(() => {
    try {
      return buildRouteMapModel(alternative, origin, destination);
    } catch {
      return null;
    }
  }, [alternative, destination, origin]);

  const representedLabels =
    model === null
      ? []
      : [...model.representedCategories].map(
          (category) => ROAD_CATEGORY_STYLE[category].label,
        );

  const summary = `${origin.label} to ${destination.label}. Selected route ${alternative.id}: ${formatDistanceMetres(
    alternative.distanceMetres,
  )}, ${formatDurationSeconds(alternative.durationSeconds)}. Road categories represented: ${
    representedLabels.length > 0 ? representedLabels.join(', ') : 'none'
  }.`;

  return (
    <section
      aria-labelledby={headingId}
      className={`grid gap-3 ${className}`.trim()}
    >
      <div className="grid gap-1">
        <h2 id={headingId} className="text-lg font-semibold text-slate-950">
          Route map
        </h2>
        <p className="text-sm leading-6 text-slate-700">{summary}</p>
        {isUpdating ? (
          <p role="status" className="text-sm font-medium text-emerald-900">
            Updating route map...
          </p>
        ) : null}
      </div>

      <div
        role="region"
        aria-label={`Map showing the selected route from ${origin.label} to ${destination.label}`}
        className="relative min-h-[18rem] overflow-hidden rounded-md border border-slate-200 bg-slate-100 sm:min-h-[22rem] lg:min-h-[26rem]"
      >
        {model === null || mapError ? (
          <RouteMapFallback
            originLabel={origin.label}
            destinationLabel={destination.label}
            alternative={alternative}
            onRetry={
              model === null
                ? undefined
                : () => {
                    setMapError(false);
                    setErrorGeneration((generation) => generation + 1);
                  }
            }
          />
        ) : (
          <div className="absolute inset-0">
            <RouteMapCanvas
              key={errorGeneration}
              model={model}
              mapStyleUrl={clientEnvironment.VITE_MAP_STYLE_URL}
              onError={handleMapError}
            />
          </div>
        )}
      </div>

      {model === null ? null : (
        <RouteMapLegend representedCategories={model.representedCategories} />
      )}
    </section>
  );
}
