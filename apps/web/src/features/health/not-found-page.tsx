import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="page-shell not-found">
      <h1>Page not found</h1>
      <Link to="/">Return to RouteCost</Link>
    </main>
  );
}
