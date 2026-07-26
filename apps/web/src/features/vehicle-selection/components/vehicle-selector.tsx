import type { VehicleSummary } from '@route-cost/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getOperationErrorMessage } from '../../../shared/api';
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  InlineAlert,
  Select,
} from '../../../shared/components';
import { fetchVehicles } from '../../vehicle-selection/api/vehicle-api';
import { vehicleQueryKeys } from '../../vehicle-selection/api/vehicle-query-keys';
import { groupVehicles, vehicleCategoryLabels } from '../lib/vehicle-groups';

export type VehicleSelectValue = string;

export interface VehicleSelectorProps {
  readonly value: VehicleSelectValue;
  readonly onChange: (value: VehicleSelectValue) => void;
  readonly selectedVehicle: VehicleSummary | null;
  readonly onVehiclesLoaded?: (vehicles: readonly VehicleSummary[]) => void;
  readonly error?: string | undefined;
}

export function VehicleSelector({
  value,
  onChange,
  selectedVehicle,
  onVehiclesLoaded,
  error,
}: VehicleSelectorProps) {
  const vehiclesQuery = useQuery({
    queryKey: vehicleQueryKeys.list(),
    queryFn: ({ signal }) => fetchVehicles({ signal }),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (vehiclesQuery.data !== undefined) {
      onVehiclesLoaded?.(vehiclesQuery.data.items);
    }
  }, [onVehiclesLoaded, vehiclesQuery.data]);

  const groups = groupVehicles(vehiclesQuery.data?.items ?? []);

  return (
    <Field>
      <FieldLabel htmlFor="vehicle-select">Vehicle</FieldLabel>
      {vehiclesQuery.isLoading ? (
        <p role="status" className="text-sm text-slate-600">
          Loading vehicles...
        </p>
      ) : null}
      {vehiclesQuery.isError ? (
        <InlineAlert tone="error">
          <p>{getOperationErrorMessage(vehiclesQuery.error, 'vehicles')}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            onClick={() => {
              void vehiclesQuery.refetch();
            }}
          >
            Retry
          </Button>
        </InlineAlert>
      ) : null}
      <Select
        id="vehicle-select"
        value={value}
        invalid={error !== undefined}
        disabled={vehiclesQuery.isLoading}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a vehicle</option>
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.displayName}
              </option>
            ))}
          </optgroup>
        ))}
        <option value="custom">Custom vehicle</option>
      </Select>
      {vehiclesQuery.isSuccess && vehiclesQuery.data.items.length === 0 ? (
        <FieldDescription>
          No vehicles are currently available.
        </FieldDescription>
      ) : null}
      {selectedVehicle === null ? null : (
        <FieldDescription>
          {vehicleCategoryLabels[selectedVehicle.vehicleCategory]} ·{' '}
          {selectedVehicle.fuelType} · {selectedVehicle.powertrainType} ·{' '}
          {selectedVehicle.consumptionData.status} ·{' '}
          {selectedVehicle.consumptionData.confidence} confidence
        </FieldDescription>
      )}
      {error === undefined ? null : <FieldError>{error}</FieldError>}
    </Field>
  );
}
