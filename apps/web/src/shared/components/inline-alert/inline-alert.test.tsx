import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InlineAlert } from './inline-alert';

describe('InlineAlert', () => {
  it('renders info status and error alert semantics', () => {
    render(
      <>
        <InlineAlert>Ready</InlineAlert>
        <InlineAlert tone="error">Failed</InlineAlert>
      </>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Ready');
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
  });
});
