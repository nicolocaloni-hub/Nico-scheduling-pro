import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') !== 'light';
    setDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    if (newMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    // Force reload or context update if needed, but class change is usually enough for Tailwind
    // However, since we use hardcoded bg-gray-900 etc, we might need more effort for real light mode.
    // The request asks for "predisposizione" and "toggle".
    // Since the app is heavily styled with bg-gray-900, a full light theme requires replacing all hardcoded colors with variables or dark: modifiers.
    // For now, we implement the switch and persistence.
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-4">Impostazioni</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Tema Scuro</span>
            <button 
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-primary-600' : 'bg-gray-600'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : ''}`}></div>
            </button>
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={onClose} className="w-full">Chiudi</Button>
        </div>
      </div>
    </div>
  );
};
