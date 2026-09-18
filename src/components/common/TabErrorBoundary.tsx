import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  tabKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class TabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[TabErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.tabKey !== this.props.tabKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Terjadi Kesalahan</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1 max-w-md">
            Halaman ini mengalami error dan tidak dapat ditampilkan.
          </p>
          <p className="text-xs text-red-500 dark:text-red-400 mb-6 max-w-md font-mono bg-red-50 dark:bg-red-900/10 p-3 rounded-xl">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
          >
            <RefreshCw size={14} /> Coba Lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
