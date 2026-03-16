import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  blockLabel: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class BlockErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center h-full min-h-[80px]">
          <AlertTriangle size={18} className="text-warning mb-2" />
          <p className="text-xs text-zinc-400 mb-1">
            <span className="text-zinc-300 font-medium">{this.props.blockLabel}</span> failed to render
          </p>
          <p className="text-2xs text-zinc-600 mb-3 max-w-xs">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 text-2xs text-accent hover:text-accent-hover transition-colors"
          >
            <RotateCcw size={11} /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
