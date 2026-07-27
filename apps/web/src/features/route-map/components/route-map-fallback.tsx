import { formatDistanceMetres } from '../../../shared/lib/format-distance';
import { formatDurationSeconds } from '../../../shared/lib/format-duration';
import type { RouteCostAlternative } from '../model/route-map-model';

export function RouteMapFallback({
  originLabel,
  destinationLabel,
  alternative,
  onRetry,
}: {
  readonly originLabel?: string | undefined;
  readonly destinationLabel?: string | undefined;
  readonly alternative?: RouteCostAlternative | undefined;
  readonly onRetry?: (() => void) | undefined;
}) {
  return (
    <div
      role="alert"
      className="grid min-h-[18rem] place-items-center rounded-md border border-slate-200 bg-slate-50 p-4 text-center"
    >
      <div className="grid max-w-md gap-3">
        <p className="font-semibold text-slate-950">
          The route was calculated, but the map could not be displayed.
        </p>
        {alternative === undefined ||
        originLabel === undefined ||
        destinationLabel === undefined ? null : (
          <p className="text-sm leading-6 text-slate-700">
            {originLabel} to {destinationLabel}:{' '}
            {formatDistanceMetres(alternative.distanceMetres)},{' '}
            {formatDurationSeconds(alternative.durationSeconds)}.
          </p>
        )}
        {onRetry === undefined ? null : (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Retry map
          </button>
        )}
      </div>
    </div>
  );
}
