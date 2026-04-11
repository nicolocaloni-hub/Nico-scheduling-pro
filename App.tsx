
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ScriptImport } from './pages/ScriptImport';
import { StripboardView } from './pages/Stripboard';
import { CalendarPage } from './pages/CalendarPage';

import { ScenesPage } from './pages/ScenesPage';
import { CharactersPage } from './pages/CharactersPage';
import { LocationsPage } from './pages/LocationsPage';
import { PropsPage } from './pages/PropsPage';
import { ManualStripboardCreate } from './pages/ManualStripboardCreate';
import { LandingPage } from './pages/LandingPage';
import { ODGPage } from './pages/ODGPage';
import { AnalysisProvider } from './contexts/AnalysisContext';

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
          <div className="bg-red-900/50 p-6 rounded-xl border border-red-500 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Qualcosa è andato storto</h2>
            <p className="text-sm text-red-200 mb-4">{this.state.error?.message}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 px-4 py-2 rounded font-bold hover:bg-red-500"
            >
              Ricarica App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AnalysisProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/projects" element={<Layout><Dashboard /></Layout>} />
            <Route path="/odg" element={<Layout><ODGPage /></Layout>} />
            
            <Route path="/script" element={<Layout><ScriptImport /></Layout>} />
            <Route path="/stripboard" element={<Layout><StripboardView /></Layout>} />
            <Route path="/stripboard/manual/create" element={<Layout><ManualStripboardCreate /></Layout>} />
            <Route path="/calendar" element={<Layout><CalendarPage /></Layout>} />
            <Route path="/scenes" element={<Layout><ScenesPage /></Layout>} />
            <Route path="/characters" element={<Layout><CharactersPage /></Layout>} />
            <Route path="/locations" element={<Layout><LocationsPage /></Layout>} />
            <Route path="/props" element={<Layout><PropsPage /></Layout>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </HashRouter>
      </AnalysisProvider>
    </ErrorBoundary>
  );
};

export default App;
