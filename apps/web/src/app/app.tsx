import { Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from '../components/error-boundary';
import { NotFoundPage } from '../features/health/not-found-page';
import { RouteEstimatorPage } from '../pages/route-estimator/route-estimator-page';

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<RouteEstimatorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
