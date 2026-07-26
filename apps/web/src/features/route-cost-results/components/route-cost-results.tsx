import type { EstimateRouteCostResponse } from '@route-cost/contracts';
import { useMemo, useState } from 'react';

import { InlineAlert, Surface } from '../../../shared/components';
import { formatFuelConsumptionRate } from '../../../shared/lib/format-consumption';
import { formatDistanceMetres } from '../../../shared/lib/format-distance';
import { formatDurationSeconds } from '../../../shared/lib/format-duration';
import { formatLitres } from '../../../shared/lib/format-litres';
import { formatMoney } from '../../../shared/lib/format-money';

const categoryOrder = ['urban', 'interurban', 'motorway', 'unknown'] as const;
const categoryLabels = {
  urban: 'Urban',
  interurban: 'Interurban',
  motorway: 'Motorway',
  unknown: 'Unknown',
} as const;

export interface RouteCostResultsProps {
  readonly result: EstimateRouteCostResponse | null;
  readonly isRecalculating?: boolean;
}

export function RouteCostResults({
  result,
  isRecalculating = false,
}: RouteCostResultsProps) {
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<
    string | null
  >(null);

  const selectedAlternative = useMemo(() => {
    if (result === null) {
      return null;
    }

    return (
      result.alternatives.find(
        (alternative) => alternative.id === selectedAlternativeId,
      ) ??
      result.alternatives[0] ??
      null
    );
  }, [result, selectedAlternativeId]);

  if (result === null) {
    return (
      <Surface className="grid gap-3 p-4">
        <h2 className="text-lg font-semibold text-slate-950">Results</h2>
        <p className="text-sm text-slate-600">
          Enter a route and vehicle details to calculate the estimated cost.
        </p>
      </Surface>
    );
  }

  if (selectedAlternative === null) {
    return (
      <Surface className="grid gap-3 p-4">
        <h2 className="text-lg font-semibold text-slate-950">Results</h2>
        <InlineAlert tone="error">
          No route alternatives were returned.
        </InlineAlert>
      </Surface>
    );
  }

  return (
    <Surface className="grid gap-5 p-4">
      <div className="grid gap-2">
        <h2 className="text-lg font-semibold text-slate-950">Results</h2>
        {isRecalculating ? (
          <p role="status" className="text-sm font-medium text-emerald-900">
            Recalculating route...
          </p>
        ) : null}
      </div>

      {result.alternatives.length > 1 ? (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-slate-900">
            Route alternatives
          </legend>
          {result.alternatives.map((alternative, index) => (
            <label
              key={alternative.id}
              className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="route-alternative"
                value={alternative.id}
                checked={selectedAlternative.id === alternative.id}
                onChange={() => setSelectedAlternativeId(alternative.id)}
              />
              <span>
                {index === 0 ? 'Fastest route' : `Alternative ${index}`} ·{' '}
                {formatDistanceMetres(alternative.distanceMetres)} ·{' '}
                {formatMoney(alternative.costEstimate.estimatedCost)}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="Distance"
          value={formatDistanceMetres(selectedAlternative.distanceMetres)}
        />
        <Metric
          label="Duration"
          value={formatDurationSeconds(selectedAlternative.durationSeconds)}
        />
        <Metric
          label="Estimated fuel"
          value={formatLitres(selectedAlternative.fuelEstimate.totalLitres)}
        />
        <Metric
          label="Estimated cost"
          value={formatMoney(selectedAlternative.costEstimate.estimatedCost)}
        />
      </dl>

      <section className="grid gap-3" aria-labelledby="vehicle-result-heading">
        <h3
          id="vehicle-result-heading"
          className="font-semibold text-slate-950"
        >
          Vehicle profile
        </h3>
        <p className="text-sm text-slate-700">
          {result.vehicle.source === 'catalog'
            ? `${result.vehicle.displayName ?? result.vehicle.vehicleId ?? 'Catalog vehicle'} · Catalog vehicle`
            : `Custom ${result.vehicle.vehicleCategory.replaceAll('-', ' ')} · Custom consumption profile`}
        </p>
        {result.vehicle.consumptionData === undefined ? null : (
          <p className="text-sm text-slate-600">
            {result.vehicle.consumptionData.status} consumption profile ·{' '}
            {result.vehicle.consumptionData.confidence} confidence
          </p>
        )}
        <p className="text-sm text-slate-600">
          Category consumption may be estimated and should not be treated as an
          exact measurement.
        </p>
      </section>

      <section className="grid gap-3" aria-labelledby="breakdown-heading">
        <h3 id="breakdown-heading" className="font-semibold text-slate-950">
          Road category breakdown
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {categoryOrder.map((category) => {
            const item = selectedAlternative.fuelEstimate.breakdown[category];

            return (
              <article
                key={category}
                className="grid gap-2 rounded-md border border-slate-200 p-3"
              >
                <h4 className="font-semibold text-slate-950">
                  {categoryLabels[category]}
                </h4>
                <dl className="grid gap-1 text-sm">
                  <BreakdownMetric
                    label="Distance"
                    value={formatDistanceMetres(item.distanceMetres)}
                  />
                  <BreakdownMetric
                    label="Consumption"
                    value={formatFuelConsumptionRate(item.litresPer100Km)}
                  />
                  <BreakdownMetric
                    label="Estimated fuel"
                    value={formatLitres(item.estimatedLitres)}
                  />
                </dl>
              </article>
            );
          })}
        </div>
      </section>
    </Surface>
  );
}

function Metric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <dt className="text-xs font-semibold text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="text-lg font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function BreakdownMetric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-medium text-slate-950">{value}</dd>
    </div>
  );
}
