
import React from 'react';
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

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/script" element={<Layout><ScriptImport /></Layout>} />
        <Route path="/stripboard" element={<Layout><StripboardView /></Layout>} />
        <Route path="/calendar" element={<Layout><CalendarPage /></Layout>} />
        <Route path="/scenes" element={<Layout><ScenesPage /></Layout>} />
        <Route path="/characters" element={<Layout><CharactersPage /></Layout>} />
        <Route path="/locations" element={<Layout><LocationsPage /></Layout>} />
        <Route path="/props" element={<Layout><PropsPage /></Layout>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
