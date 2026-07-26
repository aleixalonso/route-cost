import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export function FieldError({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={clsx('text-sm font-medium text-red-700', className)}
      {...props}
    />
  );
}
