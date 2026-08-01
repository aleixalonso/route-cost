import type {
  EstimateRouteCostResponse,
  RoutePreferences,
  VehicleSummary,
} from '@route-cost/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Controller, useForm, useWatch } from 'react-hook-form';

import {
  type LocationAttribution,
  LocationSearchField,
  type SelectedLocation,
} from '../../features/location-search';
import {
  type FuelPriceInputState,
  FuelPriceSuggestionStatus,
} from '../../features/route-cost-form/components/fuel-price-suggestion-status';
import { RoutePreferencesFieldset } from '../../features/route-cost-form/components/route-preferences-fieldset';
import {
  buildFuelPriceSuggestionRequest,
  fuelPriceSuggestionQueryKey,
} from '../../features/route-cost-form/lib/build-fuel-price-suggestion-request';
import { buildRouteCostEstimateRequest } from '../../features/route-cost-form/lib/build-route-cost-estimate-request';
import { suggestFuelPrice } from '../../features/route-cost-form/lib/fuel-price-suggestion-api';
import { postRouteCostEstimate } from '../../features/route-cost-form/lib/route-cost-api';
import {
  getFirstInvalidRegisteredField,
  getVehicleMode,
  routeEstimatorDefaultValues,
  type RouteEstimatorFieldErrors,
  type RouteEstimatorUiFormValues,
  validateRouteEstimatorForm,
} from '../../features/route-cost-form/model/route-estimator-ui-form';
import { RouteCostResults } from '../../features/route-cost-results';
import { routePreferencesEqual } from '../../features/route-cost-results/lib/route-characteristics';
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

export function RouteEstimatorPage() {
  const { control, register, handleSubmit, setValue, setFocus, getValues } =
    useForm<RouteEstimatorUiFormValues>({
      defaultValues: routeEstimatorDefaultValues,
    });
  const [vehicles, setVehicles] = useState<readonly VehicleSummary[]>([]);
  const [fieldErrors, setFieldErrors] = useState<RouteEstimatorFieldErrors>({});
  const [lastResult, setLastResult] =
    useState<EstimateRouteCostResponse | null>(null);
  const [lastRouteLocations, setLastRouteLocations] = useState<{
    readonly origin: SelectedLocation;
    readonly destination: SelectedLocation;
  } | null>(null);
  const [attribution, setAttribution] = useState<LocationAttribution | null>(
    null,
  );

  const vehicleSelect = useWatch({ control, name: 'vehicleSelect' });
  const origin = useWatch({ control, name: 'origin' });
  const fuelProduct = useWatch({ control, name: 'fuelProduct' });
  const avoidTolls = useWatch({ control, name: 'avoidTolls' });
  const avoidMotorways = useWatch({ control, name: 'avoidMotorways' });
  const avoidFerries = useWatch({ control, name: 'avoidFerries' });
  const priority = useWatch({ control, name: 'priority' });
  const vehicleMode = getVehicleMode(vehicleSelect);
  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleSelect) ?? null,
    [vehicleSelect, vehicles],
  );

  const routeCostMutation = useMutation({ mutationFn: postRouteCostEstimate });
  const currentPreferences: RoutePreferences = {
    avoidTolls,
    avoidMotorways,
    avoidFerries,
    priority,
  };
  const preferencesStale =
    lastResult !== null &&
    !routePreferencesEqual(currentPreferences, lastResult.routePreferences);
  const [fuelPriceState, setFuelPriceState] = useState<FuelPriceInputState>({
    source: 'empty',
    amountText: '',
  });
  const suggestionRequest = useMemo(
    () =>
      buildFuelPriceSuggestionRequest({
        ...getValues(),
        origin,
        vehicleSelect,
        fuelProduct,
      }),
    [fuelProduct, getValues, origin, vehicleSelect],
  );
  const fuelPriceSuggestionQuery = useQuery({
    queryKey: fuelPriceSuggestionQueryKey(suggestionRequest),
    queryFn: ({ signal }) => {
      if (suggestionRequest === null) {
        throw new Error('Fuel price suggestion request is not ready.');
      }

      return suggestFuelPrice(suggestionRequest, signal);
    },
    enabled: suggestionRequest !== null,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      error instanceof Error && error.name !== 'AbortError' && failureCount < 1,
  });

  useEffect(() => {
    const response = fuelPriceSuggestionQuery.data;

    if (response?.status !== 'available') {
      return;
    }

    const amountText = response.suggestion.suggestedPricePerLitre.amount
      .toFixed(3)
      .replace(/0+$/u, '')
      .replace(/\.$/u, '');

    // Async suggestion is external data; this syncs it into the editable form.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFuelPriceState((current) => {
      if (current.source === 'manual') {
        return {
          source: 'manual',
          amountText: current.amountText,
          previousSuggestion: response,
        };
      }

      setValue('fuelPrice', Number(amountText), { shouldValidate: true });

      return {
        source: 'suggested',
        amountText,
        suggestion: response,
      };
    });
  }, [fuelPriceSuggestionQuery.data, setValue]);

  const submit = handleSubmit((values) => {
    const validation = validateRouteEstimatorForm(values);
    setFieldErrors(validation.errors);

    if (validation.values === null) {
      const field = getFirstInvalidRegisteredField(validation.errors);

      if (field !== null) {
        setFocus(field);
      }

      return;
    }

    const validValues = validation.values;
    const request = buildRouteCostEstimateRequest(validValues);
    routeCostMutation.mutate(request, {
      onSuccess: (result) => {
        setLastResult(result);
        setLastRouteLocations({
          origin: validValues.origin,
          destination: validValues.destination,
        });
      },
    });
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

  function handleFuelPriceChange(event: ChangeEvent<HTMLInputElement>): void {
    const value = event.target.value;

    setFuelPriceState((current) => ({
      source: 'manual',
      amountText: value,
      ...(current.source === 'suggested'
        ? { previousSuggestion: current.suggestion }
        : current.source === 'manual' &&
            current.previousSuggestion !== undefined
          ? {
              previousSuggestion: current.previousSuggestion,
            }
          : {}),
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

            <RoutePreferencesFieldset
              priorityRegistration={register('priority')}
              avoidanceRegistrations={{
                avoidTolls: register('avoidTolls'),
                avoidMotorways: register('avoidMotorways'),
                avoidFerries: register('avoidFerries'),
              }}
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
                <Field>
                  <FieldLabel htmlFor="fuel-product">
                    Fuel product for price suggestion
                  </FieldLabel>
                  <Select id="fuel-product" {...register('fuelProduct')}>
                    <option value="">Choose fuel product</option>
                    <option value="petrol-95-e5">Petrol 95 E5</option>
                    <option value="diesel-a">Diesel A</option>
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
                  {...register('fuelPrice', {
                    valueAsNumber: true,
                    onChange: handleFuelPriceChange,
                  })}
                />
                <span className="text-sm font-semibold text-slate-700">
                  €/L
                </span>
              </div>
              {fieldErrors.fuelPrice === undefined ? null : (
                <FieldError>{fieldErrors.fuelPrice}</FieldError>
              )}
              <FuelPriceSuggestionStatus
                response={fuelPriceSuggestionQuery.data}
                isLoading={fuelPriceSuggestionQuery.isFetching}
                isError={fuelPriceSuggestionQuery.isError}
                hasOrigin={origin !== null}
                hasVehicleSelection={suggestionRequest !== null}
                fuelPriceState={fuelPriceState}
                onUseSuggestion={(response) => {
                  if (response.status !== 'available') {
                    return;
                  }

                  const amountText =
                    response.suggestion.suggestedPricePerLitre.amount
                      .toFixed(3)
                      .replace(/0+$/u, '')
                      .replace(/\.$/u, '');
                  setValue('fuelPrice', Number(amountText), {
                    shouldValidate: true,
                  });
                  setFuelPriceState({
                    source: 'suggested',
                    amountText,
                    suggestion: response,
                  });
                }}
              />
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
          routeLocations={lastRouteLocations}
          isRecalculating={routeCostMutation.isPending && lastResult !== null}
          isPreferencesStale={preferencesStale}
        />
        {lastResult === null ? (
          <section
            className="grid min-h-64 place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-600"
            aria-label="Route map placeholder"
          >
            Calculate a route to display it on the map.
          </section>
        ) : null}
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
