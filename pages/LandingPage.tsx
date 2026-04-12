import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, FileText, ChevronRight, Settings } from 'lucide-react';
import { SettingsModal } from '../components/SettingsModal';
import { useTranslation } from '../services/i18n';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useTranslation();

  // Apply theme on mount and listen for changes
  useEffect(() => {
    const applyTheme = () => {
      const storedTheme = localStorage.getItem('smartset_theme');
      const isDark = storedTheme === 'dark' || (!storedTheme && true); // Default to dark
      
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();
    window.addEventListener('theme-change', applyTheme);
    return () => window.removeEventListener('theme-change', applyTheme);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* Settings Button */}
      <button 
        onClick={() => setShowSettings(true)}
        className="fixed top-8 left-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all z-50 p-2"
        title={t('settings') || 'Impostazioni'}
      >
        <Settings size={28} strokeWidth={1.2} />
      </button>

      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-[0.85]">
            SMARTSET<br />PLAN SUITE
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm px-4 leading-relaxed">
            {t('landing_subtitle') || 'Strumenti professionali per la gestione della produzione cinematografica.'}
          </p>
        </div>

        {/* Cards Container */}
        <div className="space-y-4">
          
          {/* Smart Set Scheduling Pro Card */}
          <div 
            onClick={() => navigate('/projects')}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
          >
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
              <Clapperboard size={32} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight mb-1">SCHEDULING PRO</h2>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                {t('landing_stripboard_label') || 'PIANO DI LAVORAZIONE'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                {t('scheduling_desc') || 'Gestione professionale di scene, cast, location e piano di lavorazione dinamico.'}
              </p>
            </div>
            <ChevronRight className="text-gray-300 dark:text-gray-600" size={24} />
          </div>

          {/* ODG Card */}
          <div 
            onClick={() => navigate('/odg')}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
          >
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
              <FileText size={32} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight mb-1">ODG DAILY</h2>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                {t('odg_label') || 'ORDINE DEL GIORNO'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                {t('odg_desc') || 'Creazione e gestione degli ordini del giorno, convocazioni e note di produzione.'}
              </p>
            </div>
            <ChevronRight className="text-gray-300 dark:text-gray-600" size={24} />
          </div>

        </div>

        {/* Footer */}
        <div className="pt-12 text-center space-y-1">
          <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 tracking-[0.2em] uppercase">SMARTSET</p>
          <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 tracking-[0.1em] uppercase">
            POWERED BY NICOLÒ CALONI
          </p>
          <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 tracking-[0.1em] uppercase">
            <a href="https://www.instagram.com/nicolo.cc?igsh=MXJ1bXRoejJ5bTJzcw==" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">@NICOLO.CC</a>
          </p>
        </div>

      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};
