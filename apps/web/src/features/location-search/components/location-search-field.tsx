import type { AutocompleteLocationsResponse } from '@route-cost/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getOperationErrorMessage, isAbortError } from '../../../shared/api';
import { Field, FieldError, FieldLabel } from '../../../shared/components';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';
import {
  fetchLocationAutocomplete,
  fetchLocationDetails,
} from '../../location-search/api/location-api';
import { locationQueryKeys } from '../../location-search/api/location-query-keys';
import type { SelectedLocation } from '../model/selected-location';

type AutocompleteSuggestion = AutocompleteLocationsResponse['items'][number];

const minimumQueryLength = 3;
const debounceMilliseconds = 300;
const language = 'es';
const countryCode = 'ES' as const;
const limit = 5;

export interface LocationAttribution {
  readonly url: string;
}

export interface LocationSearchFieldProps {
  readonly label: string;
  readonly value: SelectedLocation | null;
  readonly onChange: (location: SelectedLocation | null) => void;
  readonly inputName: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly error?: string | undefined;
  readonly onAttributionChange?: (attribution: LocationAttribution) => void;
}

export function LocationSearchField({
  label,
  value,
  onChange,
  inputName,
  placeholder,
  disabled = false,
  error,
  onAttributionChange,
}: LocationSearchFieldProps) {
  const generatedId = useId();
  const inputId = `${inputName}-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const statusId = `${inputId}-status`;
  const errorId = `${inputId}-error`;
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputText, setInputText] = useState(value?.label ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const trimmedInput = inputText.trim();
  const debouncedInput = useDebouncedValue(trimmedInput, debounceMilliseconds);
  const selectedTextMatches = value !== null && inputText === value.label;
  const shouldSearch =
    !disabled &&
    !selectedTextMatches &&
    debouncedInput.length >= minimumQueryLength;

  const autocompleteParameters = useMemo(
    () => ({
      query: debouncedInput,
      countryCode,
      language,
      limit,
    }),
    [debouncedInput],
  );

  const suggestionsQuery = useQuery({
    queryKey: locationQueryKeys.autocomplete(autocompleteParameters),
    queryFn: ({ signal }) =>
      fetchLocationAutocomplete({ ...autocompleteParameters, signal }),
    enabled: shouldSearch,
    staleTime: 30_000,
  });

  const suggestions = suggestionsQuery.data?.items ?? [];

  useEffect(() => {
    if (suggestionsQuery.data?.attribution !== undefined) {
      onAttributionChange?.(suggestionsQuery.data.attribution);
    }
  }, [onAttributionChange, suggestionsQuery.data?.attribution]);

  function handleInputChange(nextValue: string): void {
    setInputText(nextValue);
    setDetailsError(null);
    setActiveIndex(-1);
    setIsOpen(true);

    if (value !== null) {
      onChange(null);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (disabled) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((currentIndex) =>
        Math.min(currentIndex + 1, suggestions.length - 1),
      );
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
    }

    if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      event.preventDefault();
      void selectSuggestion(suggestions[activeIndex]);
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }

    if (event.key === 'Home') {
      setActiveIndex(0);
    }

    if (event.key === 'End') {
      setActiveIndex(Math.max(suggestions.length - 1, 0));
    }
  }

  async function selectSuggestion(
    suggestion: AutocompleteSuggestion | undefined,
  ): Promise<void> {
    if (suggestion === undefined || resolvingId !== null) {
      return;
    }

    setResolvingId(suggestion.id);
    setDetailsError(null);

    try {
      const response = await queryClient.fetchQuery({
        queryKey: locationQueryKeys.details(suggestion.id, language),
        queryFn: ({ signal }) =>
          fetchLocationDetails({
            placeId: suggestion.id,
            language,
            signal,
          }),
        staleTime: 5 * 60_000,
      });

      onAttributionChange?.(response.attribution);
      onChange({
        id: response.location.id,
        label: response.location.label,
        coordinate: response.location.coordinate,
      });
      setInputText(response.location.label);
      setIsOpen(false);
      setActiveIndex(-1);
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        setDetailsError(getOperationErrorMessage(error, 'details'));
      }
    } finally {
      setResolvingId(null);
    }
  }

  const statusText = getStatusText({
    inputText,
    debouncedInput,
    shouldSearch,
    selectedTextMatches,
    isLoading: suggestionsQuery.isLoading || resolvingId !== null,
    isError: suggestionsQuery.isError,
    isEmpty:
      shouldSearch && suggestionsQuery.isSuccess && suggestions.length === 0,
    detailsError,
  });

  const describedBy = clsx(statusId, error ? errorId : undefined);

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          name={inputName}
          type="text"
          value={inputText}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-describedby={describedBy}
          aria-invalid={error !== undefined || detailsError !== null}
          className={clsx(
            'min-h-11 w-full rounded-md border bg-white px-3 py-2 text-base text-slate-950 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:bg-slate-100 disabled:text-slate-500',
            error !== undefined || detailsError !== null
              ? 'border-red-600 focus-visible:outline-red-600'
              : 'border-slate-300 focus-visible:outline-emerald-800',
          )}
        />

        {isOpen && !disabled && shouldShowListbox(shouldSearch, suggestions) ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-10 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
          >
            {suggestions.map((suggestion, index) => (
              <li
                id={`${listboxId}-option-${index}`}
                key={suggestion.id}
                role="option"
                aria-selected={activeIndex === index}
              >
                <button
                  type="button"
                  disabled={resolvingId !== null}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    void selectSuggestion(suggestion);
                  }}
                  className={clsx(
                    'grid w-full gap-0.5 rounded px-3 py-2 text-left text-sm disabled:opacity-60',
                    activeIndex === index
                      ? 'bg-emerald-800 text-white'
                      : 'text-slate-900 hover:bg-slate-100',
                  )}
                >
                  <span className="font-semibold">
                    {suggestion.primaryText}
                  </span>
                  {suggestion.secondaryText === undefined ? null : (
                    <span className="text-xs opacity-80">
                      {suggestion.secondaryText}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className="text-sm text-slate-600"
      >
        {statusText}
      </p>
      {error === undefined ? null : (
        <FieldError id={errorId}>{error}</FieldError>
      )}
      {detailsError === null ? null : <FieldError>{detailsError}</FieldError>}
    </Field>
  );
}

interface StatusState {
  readonly inputText: string;
  readonly debouncedInput: string;
  readonly shouldSearch: boolean;
  readonly selectedTextMatches: boolean;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isEmpty: boolean;
  readonly detailsError: string | null;
}

function getStatusText(state: StatusState): string {
  if (state.detailsError !== null) {
    return state.detailsError;
  }

  if (state.selectedTextMatches) {
    return 'Selected location.';
  }

  if (
    state.inputText.trim().length > 0 &&
    state.inputText.trim().length < minimumQueryLength
  ) {
    return 'Enter at least three characters.';
  }

  if (state.inputText.trim() !== state.debouncedInput) {
    return 'Preparing location search...';
  }

  if (state.isLoading) {
    return 'Searching locations...';
  }

  if (state.isError) {
    return 'Location search is temporarily unavailable.';
  }

  if (state.isEmpty) {
    return 'No locations found.';
  }

  if (state.shouldSearch) {
    return 'Choose a location from the results.';
  }

  return 'Search for a location.';
}

function shouldShowListbox(
  shouldSearch: boolean,
  suggestions: readonly AutocompleteSuggestion[],
): boolean {
  return shouldSearch && suggestions.length > 0;
}
