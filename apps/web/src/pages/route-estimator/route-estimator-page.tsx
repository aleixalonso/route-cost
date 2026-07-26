import type {
  EstimateRouteCostResponse,
  VehicleRoutingCategory,
  VehicleSummary,
} from '@route-cost/contracts';
import { consumptionProfileSchema } from '@route-cost/contracts';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import {
  type LocationAttribution,
  LocationSearchField,
  type SelectedLocation,
} from '../../features/location-search';
import { buildRouteCostEstimateRequest } from '../../features/route-cost-form/lib/build-route-cost-estimate-request';
import { postRouteCostEstimate } from '../../features/route-cost-form/lib/route-cost-api';
import type { RouteEstimatorFormValues } from '../../features/route-cost-form/model/route-estimator-form';
import { RouteCostResults } from '../../features/route-cost-results';
import {
  vehicleCategoryLabels,
  VehicleSelector,
} from '../../features/vehicle-selection';
import { getOperationErrorMessage } from '../../shared/api';
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  InlineAlert,
  Input,
  Select,
  Surface,
} from '../../shared/components';

type VehicleMode = 'catalog' | 'custom';
type ConsumptionProfile = z.infer<typeof consumptionProfileSchema>;

interface RouteEstimatorUiFormValues {
  readonly origin: SelectedLocation | null;
  readonly destination: SelectedLocation | null;
  readonly vehicleSelect: string;
  readonly vehicleCategory: VehicleRoutingCategory;
  readonly urbanLitresPer100Km: number;
  readonly interurbanLitresPer100Km: number;
  readonly motorwayLitresPer100Km: number;
  readonly unknownLitresPer100Km: number;
  readonly fuelPrice: number;
}

type FieldErrors = {
  [K in keyof RouteEstimatorUiFormValues | 'sameRoute']?: string | undefined;
};

export function RouteEstimatorPage() {
  const { control, register, handleSubmit, setValue, setFocus, getValues } =
    useForm<RouteEstimatorUiFormValues>({
      defaultValues: {
        origin: null,
        destination: null,
        vehicleSelect: '',
        vehicleCategory: 'maxi-scooter',
        urbanLitresPer100Km: 3.8,
        interurbanLitresPer100Km: 3,
        motorwayLitresPer100Km: 4.1,
        unknownLitresPer100Km: 3.4,
        fuelPrice: Number.NaN,
      },
    });
  const [vehicles, setVehicles] = useState<readonly VehicleSummary[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [lastResult, setLastResult] =
    useState<EstimateRouteCostResponse | null>(null);
  const [attribution, setAttribution] = useState<LocationAttribution | null>(
    null,
  );

  const vehicleSelect = useWatch({ control, name: 'vehicleSelect' });
  const vehicleMode: VehicleMode =
    vehicleSelect === 'custom' ? 'custom' : 'catalog';
  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleSelect) ?? null,
    [vehicleSelect, vehicles],
  );

  const routeCostMutation = useMutation({
    mutationFn: postRouteCostEstimate,
    onSuccess: (result) => {
      setLastResult(result);
    },
  });

  const submit = handleSubmit((values) => {
    const validation = validateForm(values);
    setFieldErrors(validation.errors);

    if (validation.values === null) {
      focusFirstInvalidField(validation.errors, setFocus);
      return;
    }

    const request = buildRouteCostEstimateRequest(validation.values);
    routeCostMutation.mutate(request);
  });

  function swapLocations(): void {
    const currentOrigin = getValues('origin');
    const currentDestination = getValues('destination');
    setValue('origin', currentDestination, { shouldValidate: true });
    setValue('destination', currentOrigin, { shouldValidate: true });
    setFieldErrors((current) => ({
      ...current,
      origin: undefined,
      destination: undefined,
      sameRoute: undefined,
    }));
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <section className="grid gap-4 lg:content-start">
        <header className="grid gap-2">
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">
            RouteCost
          </h1>
          <p className="text-sm font-bold text-emerald-800 uppercase">
            Estimate route fuel cost
          </p>
          <p className="text-base leading-7 text-slate-700">
            Search two resolved locations, choose a catalog or custom vehicle,
            and calculate fuel use and cost in EUR.
          </p>
        </header>

        <Surface className="p-4">
          <form
            className="grid gap-4"
            onSubmit={(event) => void submit(event)}
            noValidate
          >
            <Controller
              control={control}
              name="origin"
              render={({ field }) => (
                <LocationSearchField
                  key={field.value?.id ?? 'origin-empty'}
                  label="Origin"
                  inputName="origin"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Plaça de Catalunya"
                  error={fieldErrors.origin}
                  onAttributionChange={setAttribution}
                />
              )}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={swapLocations}
              aria-label="Swap origin and destination"
            >
              Swap origin and destination
            </Button>
            <Controller
              control={control}
              name="destination"
              render={({ field }) => (
                <LocationSearchField
                  key={field.value?.id ?? 'destination-empty'}
                  label="Destination"
                  inputName="destination"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Sagrada Família"
                  error={fieldErrors.destination ?? fieldErrors.sameRoute}
                  onAttributionChange={setAttribution}
                />
              )}
            />

            <Controller
              control={control}
              name="vehicleSelect"
              render={({ field }) => (
                <VehicleSelector
                  value={field.value}
                  onChange={(nextValue) => {
                    field.onChange(nextValue);
                    setFieldErrors((current) => ({
                      ...current,
                      vehicleSelect: undefined,
                    }));
                  }}
                  selectedVehicle={selectedVehicle}
                  onVehiclesLoaded={setVehicles}
                  error={fieldErrors.vehicleSelect}
                />
              )}
            />

            {vehicleMode === 'custom' ? (
              <fieldset className="grid gap-3 rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-sm font-semibold text-slate-900">
                  Custom vehicle consumption
                </legend>
                <Field>
                  <FieldLabel htmlFor="vehicle-category">
                    Vehicle category
                  </FieldLabel>
                  <Select
                    id="vehicle-category"
                    {...register('vehicleCategory')}
                  >
                    {Object.entries(vehicleCategoryLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </Select>
                </Field>
                <ConsumptionInput
                  id="urban-consumption"
                  label="Urban consumption"
                  error={fieldErrors.urbanLitresPer100Km}
                  registration={register('urbanLitresPer100Km', {
                    valueAsNumber: true,
                  })}
                />
                <ConsumptionInput
                  id="interurban-consumption"
                  label="Interurban consumption"
                  error={fieldErrors.interurbanLitresPer100Km}
                  registration={register('interurbanLitresPer100Km', {
                    valueAsNumber: true,
                  })}
                />
                <ConsumptionInput
                  id="motorway-consumption"
                  label="Motorway consumption"
                  error={fieldErrors.motorwayLitresPer100Km}
                  registration={register('motorwayLitresPer100Km', {
                    valueAsNumber: true,
                  })}
                />
                <ConsumptionInput
                  id="unknown-consumption"
                  label="Unknown-road consumption"
                  error={fieldErrors.unknownLitresPer100Km}
                  registration={register('unknownLitresPer100Km', {
                    valueAsNumber: true,
                  })}
                />
              </fieldset>
            ) : null}

            <Field>
              <FieldLabel htmlFor="fuel-price">Fuel price</FieldLabel>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <Input
                  id="fuel-price"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  invalid={fieldErrors.fuelPrice !== undefined}
                  {...register('fuelPrice', { valueAsNumber: true })}
                />
                <span className="text-sm font-semibold text-slate-700">
                  €/L
                </span>
              </div>
              {fieldErrors.fuelPrice === undefined ? null : (
                <FieldError>{fieldErrors.fuelPrice}</FieldError>
              )}
            </Field>

            {routeCostMutation.isError ? (
              <InlineAlert tone="error">
                {getOperationErrorMessage(
                  routeCostMutation.error,
                  'route-cost',
                )}
              </InlineAlert>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              pending={routeCostMutation.isPending}
              pendingLabel="Calculating..."
            >
              Calculate route
            </Button>
          </form>
        </Surface>

        {attribution === null ? null : (
          <p className="text-xs text-slate-600">
            <a href={attribution.url} target="_blank" rel="noreferrer">
              Location data attribution
            </a>
          </p>
        )}
      </section>

      <section className="grid gap-4 lg:content-start">
        <RouteCostResults
          result={lastResult}
          isRecalculating={routeCostMutation.isPending && lastResult !== null}
        />
        <section
          className="grid min-h-64 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-600"
          aria-label="Future map area"
        >
          Route map will appear here.
        </section>
      </section>
    </main>
  );
}

function ConsumptionInput({
  id,
  label,
  registration,
  error,
}: {
  readonly id: string;
  readonly label: string;
  readonly registration: UseFormRegisterReturn;
  readonly error?: string | undefined;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          invalid={error !== undefined}
          {...registration}
        />
        <span className="text-sm font-semibold text-slate-700">L/100 km</span>
      </div>
      {error === undefined ? null : <FieldError>{error}</FieldError>}
    </Field>
  );
}

function validateForm(values: RouteEstimatorUiFormValues): {
  readonly values: RouteEstimatorFormValues | null;
  readonly errors: FieldErrors;
} {
  const errors: FieldErrors = {};

  if (values.origin === null) {
    errors.origin = 'Choose a resolved origin.';
  }

  if (values.destination === null) {
    errors.destination = 'Choose a resolved destination.';
  }

  if (
    values.origin !== null &&
    values.destination !== null &&
    values.origin.coordinate.latitude ===
      values.destination.coordinate.latitude &&
    values.origin.coordinate.longitude ===
      values.destination.coordinate.longitude
  ) {
    errors.sameRoute = 'Origin and destination must be different.';
  }

  if (values.vehicleSelect.length === 0) {
    errors.vehicleSelect = 'Choose a catalog vehicle or custom vehicle.';
  }

  if (!isPositiveFinite(values.fuelPrice)) {
    errors.fuelPrice = 'Enter a positive fuel price.';
  }

  if (values.vehicleSelect === 'custom') {
    validateConsumption(
      values.urbanLitresPer100Km,
      'urbanLitresPer100Km',
      errors,
    );
    validateConsumption(
      values.interurbanLitresPer100Km,
      'interurbanLitresPer100Km',
      errors,
    );
    validateConsumption(
      values.motorwayLitresPer100Km,
      'motorwayLitresPer100Km',
      errors,
    );
    validateConsumption(
      values.unknownLitresPer100Km,
      'unknownLitresPer100Km',
      errors,
    );
  }

  if (Object.values(errors).some((message) => message !== undefined)) {
    return { values: null, errors };
  }

  if (values.origin === null || values.destination === null) {
    return { values: null, errors };
  }

  if (values.vehicleSelect === 'custom') {
    const consumptionProfile: ConsumptionProfile = {
      urbanLitresPer100Km: values.urbanLitresPer100Km,
      interurbanLitresPer100Km: values.interurbanLitresPer100Km,
      motorwayLitresPer100Km: values.motorwayLitresPer100Km,
      unknownLitresPer100Km: values.unknownLitresPer100Km,
    };

    return {
      values: {
        mode: 'custom',
        origin: values.origin,
        destination: values.destination,
        vehicleCategory: values.vehicleCategory,
        consumptionProfile,
        fuelPrice: values.fuelPrice,
      },
      errors,
    };
  }

  return {
    values: {
      mode: 'catalog',
      origin: values.origin,
      destination: values.destination,
      vehicleId: values.vehicleSelect,
      fuelPrice: values.fuelPrice,
    },
    errors,
  };
}

function validateConsumption(
  value: number,
  field: keyof Pick<
    RouteEstimatorUiFormValues,
    | 'urbanLitresPer100Km'
    | 'interurbanLitresPer100Km'
    | 'motorwayLitresPer100Km'
    | 'unknownLitresPer100Km'
  >,
  errors: FieldErrors,
): void {
  if (!isPositiveFinite(value) || value > 100) {
    errors[field] = 'Enter a consumption value between 0 and 100.';
  }
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 100;
}

function focusFirstInvalidField(
  errors: FieldErrors,
  setFocus: ReturnType<typeof useForm<RouteEstimatorUiFormValues>>['setFocus'],
): void {
  if (errors.vehicleSelect !== undefined) {
    setFocus('vehicleSelect');
    return;
  }

  if (errors.fuelPrice !== undefined) {
    setFocus('fuelPrice');
  }
}
