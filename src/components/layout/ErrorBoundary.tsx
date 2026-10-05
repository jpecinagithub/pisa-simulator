import { Component } from 'react';
import type { ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-24 text-center" role="alert">
          <h1 className="font-display text-2xl font-bold text-navy-900">Something went wrong</h1>
          <p className="mt-3 text-ink-600">
            The page could not be loaded. Please try again or return to the home page.
          </p>
          <details className="mx-auto mt-6 max-w-xl rounded-xl border border-line bg-mist p-4 text-left">
            <summary className="cursor-pointer text-sm font-semibold text-navy-900">
              Technical details
            </summary>
            <p className="mt-2 break-words font-mono text-xs text-ink-600">
              {error.name}: {error.message}
            </p>
          </details>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Try again
            </button>
            <a href="/" className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-navy-900">
              Home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
