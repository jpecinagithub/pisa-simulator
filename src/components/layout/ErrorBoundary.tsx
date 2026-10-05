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

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-24 text-center" role="alert">
          <h1 className="font-display text-2xl font-bold text-navy-900">Something went wrong</h1>
          <p className="mt-3 text-ink-600">
            The page could not be loaded. Please try again or return to the home page.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
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
