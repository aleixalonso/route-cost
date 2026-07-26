import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the delayed value and resets the timer', () => {
    vi.useFakeTimers();
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: { query: 'abc' } } },
    );

    rerender({ value: { query: 'abcd' } });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toEqual({ query: 'abc' });

    rerender({ value: { query: 'abcde' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toEqual({ query: 'abcde' });

    unmount();
  });
});
