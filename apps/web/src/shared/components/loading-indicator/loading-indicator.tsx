import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export function LoadingIndicator({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={clsx(
        'inline-block size-4 rounded-full border-2 border-current border-r-transparent align-[-0.125em] motion-safe:animate-spin',
        className,
      )}
      {...props}
    />
  );
}
