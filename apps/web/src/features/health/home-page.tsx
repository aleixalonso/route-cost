import { useQuery } from '@tanstack/react-query';

import { fetchReadyHealth } from './health-api';

export function HomePage() {
  const health = useQuery({
    queryKey: ['health', 'ready'],
    queryFn: fetchReadyHealth,
  });

  return (
    <main className="page-shell">
      <section className="intro-band">
        <div>
          <p className="eyebrow">Initialized foundation</p>
          <h1>RouteCost</h1>
          <p className="summary">
            RouteCost has been initialized with a separated web, API, contracts,
            and domain foundation.
          </p>
        </div>
        <div className="status-panel" aria-live="polite">
          <span className="label">API connection</span>
          {health.isLoading ? <strong>Checking availability...</strong> : null}
          {health.isSuccess ? (
            <strong>API available: {health.data.service}</strong>
          ) : null}
          {health.isError ? <strong>API unavailable</strong> : null}
        </div>
      </section>
      <section className="map-placeholder" aria-label="Future map area">
        <div className="route-line" />
        <span>Map placeholder</span>
      </section>
    </main>
  );
}
