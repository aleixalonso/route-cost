import { clsx } from 'clsx';
import type { LabelHTMLAttributes } from 'react';

export function FieldLabel({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={clsx('text-sm font-semibold text-slate-900', className)}
      {...props}
    />
  );
}
