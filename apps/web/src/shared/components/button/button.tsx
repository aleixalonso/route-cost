import { clsx } from 'clsx';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'quiet';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly pending?: boolean;
  readonly pendingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      disabled,
      pending = false,
      pendingLabel,
      children,
      variant = 'primary',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none',
          variant === 'primary' &&
            'border-emerald-800 bg-emerald-800 text-white hover:bg-emerald-900 focus-visible:outline-emerald-800',
          variant === 'secondary' &&
            'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:outline-emerald-800',
          variant === 'quiet' &&
            'border-transparent bg-transparent text-emerald-900 hover:bg-emerald-50 focus-visible:outline-emerald-800',
          className,
        )}
        disabled={disabled || pending}
        {...props}
      >
        {pending ? (pendingLabel ?? 'Working...') : children}
      </button>
    );
  },
);

Button.displayName = 'Button';
