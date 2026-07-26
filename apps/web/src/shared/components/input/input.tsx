import { clsx } from 'clsx';
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid = false, ...props }, ref) => (
    <input
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

Input.displayName = 'Input';
