import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../test/render';
import { App } from './app';

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the route estimator flow', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise<Response>(() => {}),
    );

    renderWithProviders(<App />);

    expect(
      screen.getByRole('heading', { name: 'RouteCost' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Origin')).toBeInTheDocument();
    expect(screen.getByLabelText('Destination')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Calculate route' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Route map will appear here.')).toBeInTheDocument();
  });

  it('shows vehicle loading state', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise<Response>(() => {}),
    );

    renderWithProviders(<App />);

    expect(screen.getByText('Loading vehicles...')).toBeInTheDocument();
  });

  it('renders the 404 page for unknown routes', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ items: [], total: 0 }),
    );

    renderWithProviders(<App />, '/missing');

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
  });
});
