'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error reporting (e.g. Sentry)
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl border border-border p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">
            Something went wrong
          </h2>

          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>

          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mb-4 text-left">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                Error Details
              </summary>
              <pre className="mt-2 p-3 bg-background rounded-lg text-xs overflow-auto max-h-48 border border-border">
                {this.state.error?.stack}
                {'\n\nComponent Stack:'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={this.handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="primary" onClick={this.handleReload}>
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

/** HOC for wrapping any component with an error boundary */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}

/** Lightweight boundary for individual market components */
export function ComponentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Component Error</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            This component failed to load. Please refresh the page.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
