import { clsx } from 'clsx';
import { forwardRef, type SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid = false, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx(
        'min-h-11 w-full rounded-md border bg-white px-3 py-2 text-base text-slate-950 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:bg-slate-100 disabled:text-slate-500',
        invalid
          ? 'border-red-600 focus-visible:outline-red-600'
          : 'border-slate-300 focus-visible:outline-emerald-800',
        className,
      )}
      {...props}
    />
  ),
);

Select.displayName = 'Select';
