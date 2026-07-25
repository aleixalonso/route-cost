import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public override state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(
    _error: Error,
    _errorInfo: ErrorInfo,
  ): void {}

  public override render(): ReactNode {
    if (this.state.hasError) {
      return <main className="page-shell">Something went wrong.</main>;
    }

    return this.props.children;
  }
}
