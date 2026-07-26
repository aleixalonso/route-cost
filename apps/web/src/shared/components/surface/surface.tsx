import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export function Surface({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={clsx('rounded-lg border border-slate-200 bg-white', className)}
      {...props}
    />
  );
}
