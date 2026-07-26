import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export function FieldDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={clsx('text-sm text-slate-600', className)} {...props} />;
}
