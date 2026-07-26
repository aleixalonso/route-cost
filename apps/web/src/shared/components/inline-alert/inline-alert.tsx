import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export interface InlineAlertProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: 'info' | 'error';
}

export function InlineAlert({
  className,
  tone = 'info',
  ...props
}: InlineAlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx(
        'rounded-md border px-3 py-2 text-sm',
        tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-900',
        className,
      )}
      {...props}
    />
  );
}
