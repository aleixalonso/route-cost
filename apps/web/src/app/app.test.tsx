import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../test/render';
import { App } from './app';

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the application name', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

    renderWithProviders(<App />);

    expect(
      screen.getByRole('heading', { name: 'RouteCost' }),
    ).toBeInTheDocument();
  });

  it('shows the loading state while checking health', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise<Response>(() => {}),
    );

    renderWithProviders(<App />);

    expect(screen.getByText('Checking availability...')).toBeInTheDocument();
  });

  it('shows API availability after a successful health response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ status: 'ok', service: 'route-cost-api' }),
    );

    renderWithProviders(<App />);

    await waitFor(() =>
      expect(
        screen.getByText('API available: route-cost-api'),
      ).toBeInTheDocument(),
    );
  });

  it('shows an error state when health fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 503 }),
    );

    renderWithProviders(<App />);

    await waitFor(() =>
      expect(screen.getByText('API unavailable')).toBeInTheDocument(),
    );
  });

  it('renders the 404 page for unknown routes', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

    renderWithProviders(<App />, '/missing');

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
  });
});
