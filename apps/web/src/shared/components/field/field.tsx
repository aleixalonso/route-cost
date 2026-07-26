import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export function Field({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('grid gap-1.5', className)} {...props} />;
}
