import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen w-screen bg-surface text-txt-primary">
          <div className="text-center max-w-md px-6 space-y-4">
            <AlertTriangle size={40} className="mx-auto text-warning" />
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-txt-secondary">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
              >
                <RotateCcw size={14} /> Reload Page
              </button>
              <button
                onClick={this.handleDismiss}
                className="px-4 py-2 text-sm rounded-lg border border-border text-txt-muted hover:text-txt-secondary hover:border-accent/50 transition-all"
              >
                Try to Continue
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
