
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ScriptImport } from './pages/ScriptImport';
import { StripboardView } from './pages/Stripboard';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/script" element={<Layout><ScriptImport /></Layout>} />
        <Route path="/stripboard" element={<Layout><StripboardView /></Layout>} />
        <Route path="/calendar" element={<Layout><div className="p-10 text-center text-gray-500">Calendario in arrivo</div></Layout>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
