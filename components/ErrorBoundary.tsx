
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <i className="fa-solid fa-triangle-exclamation text-4xl"></i>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Ops! Qualcosa è andato storto</h2>
              <p className="text-gray-400 text-sm">
                Si è verificato un errore imprevisto. Abbiamo registrato l'accaduto e stiamo lavorando per risolverlo.
              </p>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-black/40 rounded-xl p-4 text-left overflow-auto max-h-40">
                <code className="text-xs text-red-400 font-mono">
                  {this.state.error?.toString()}
                </code>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary-500/20"
            >
              Ricarica Applicazione
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
