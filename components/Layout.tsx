
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SettingsModal } from './SettingsModal';
import { useTranslation } from '../services/i18n';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useTranslation();

  // Apply theme on mount and listen for changes
  React.useEffect(() => {
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

  const navItems = [
    { label: t('nav_projects'), path: '/', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
    )},
    { label: t('nav_script'), path: '/script', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    )},
    { label: t('nav_stripboard'), path: '/stripboard', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
    )},
    { label: t('nav_calendar'), path: '/calendar', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    )},
  ];

  const isCurrent = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col pb-20 md:pb-0 md:pl-20 transition-colors duration-300">
      {/* Desktop Side Nav */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-20 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-50 transition-colors duration-300">
        <div className="flex-1 flex flex-col items-center py-6 gap-8">
           <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-xl text-white">N</div>
           {navItems.map((item) => (
             <button
               key={item.path}
               onClick={() => navigate(item.path)}
               className={`p-3 rounded-xl transition-colors ${isCurrent(item.path) ? 'bg-primary-50 dark:bg-gray-800 text-primary-600 dark:text-primary-500' : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white'}`}
               title={item.label}
             >
               {item.icon}
             </button>
           ))}
        </div>
        <div className="pb-6 flex flex-col items-center">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-3 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors text-2xl"
          >
            ⚙️
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 relative">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 z-50 px-4 pb-safe transition-colors duration-300">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
             <button
               key={item.path}
               onClick={() => navigate(item.path)}
               className={`flex flex-col items-center justify-center w-16 h-full space-y-1 relative ${isCurrent(item.path) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}
             >
               {isCurrent(item.path) && (
                 <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-b-lg"></span>
               )}
               {item.icon}
               <span className="text-[10px] font-medium">{item.label}</span>
             </button>
           ))}
        </div>
      </nav>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};
