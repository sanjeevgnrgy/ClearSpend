'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-zinc-950">
              Something went wrong
            </h2>
            <p className="text-xs font-mono text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
