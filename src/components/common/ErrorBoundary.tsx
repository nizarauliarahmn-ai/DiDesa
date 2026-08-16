import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-6">
            <div className="text-center max-w-md">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Terjadi kesalahan pada aplikasi
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                Ada masalah saat memuat halaman ini. Silakan muat ulang untuk mencoba lagi.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                Muat Ulang
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
