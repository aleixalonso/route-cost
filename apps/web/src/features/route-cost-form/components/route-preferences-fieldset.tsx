import type { UseFormRegisterReturn } from 'react-hook-form';

const priorityLabels = [
  { value: 'fastest', label: 'Fastest' },
  { value: 'shortest', label: 'Shortest' },
] as const;

const avoidanceLabels = [
  { value: 'avoidTolls', label: 'Avoid toll roads' },
  { value: 'avoidMotorways', label: 'Avoid motorways' },
  { value: 'avoidFerries', label: 'Avoid ferries' },
] as const;

export interface RoutePreferencesFieldsetProps {
  readonly priorityRegistration: UseFormRegisterReturn;
  readonly avoidanceRegistrations: Record<
    'avoidTolls' | 'avoidMotorways' | 'avoidFerries',
    UseFormRegisterReturn
  >;
}

/**
 * Native, mobile-first route preference controls.
 *
 * Avoidance options are preferences, not prohibitions: a returned route may
 * still include an avoided feature when no reasonable alternative exists.
 */
export function RoutePreferencesFieldset({
  priorityRegistration,
  avoidanceRegistrations,
}: RoutePreferencesFieldsetProps) {
  return (
    <fieldset className="grid gap-3 rounded-md border border-slate-200 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-900">
        Route preferences
      </legend>

      <div className="grid gap-2">
        <span
          id="route-priority-group"
          className="text-sm font-medium text-slate-700"
        >
          Route priority
        </span>
        <div
          role="radiogroup"
          aria-labelledby="route-priority-group"
          className="grid gap-2"
        >
          {priorityLabels.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              <input
                type="radio"
                value={option.value}
                className="h-4 w-4 accent-emerald-700"
                {...priorityRegistration}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {avoidanceLabels.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800"
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-700"
              {...avoidanceRegistrations[option.value]}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      <p className="text-xs leading-5 text-slate-600">
        Route preferences influence route selection, but a returned route may
        still include an avoided feature when no reasonable alternative is
        available.
      </p>
    </fieldset>
  );
}
