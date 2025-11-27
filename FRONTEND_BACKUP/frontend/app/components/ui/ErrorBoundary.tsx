import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-benchr-bg-main rounded-lg border border-benchr-border">
          <div className="text-center max-w-md">
            <h2 className="text-lg font-semibold text-benchr-status-error mb-3">
              Something went wrong
            </h2>
            <p className="text-sm text-benchr-text-muted mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <details className="text-left bg-benchr-bg-elevated p-3 rounded border border-benchr-border mb-4">
              <summary className="cursor-pointer text-sm text-benchr-text-light font-mono mb-2">
                Error details
              </summary>
              <pre className="text-xs text-benchr-text-muted whitespace-pre-wrap overflow-auto max-h-40">
                {this.state.error && this.state.error.toString()}
                {this.state.error && this.state.error.stack}
              </pre>
            </details>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-benchr-gold hover:bg-benchr-gold-hover text-benchr-bg-main rounded font-medium text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
