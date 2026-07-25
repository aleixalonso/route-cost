import { Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from '../components/error-boundary';
import { HomePage } from '../features/health/home-page';
import { NotFoundPage } from '../features/health/not-found-page';

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
