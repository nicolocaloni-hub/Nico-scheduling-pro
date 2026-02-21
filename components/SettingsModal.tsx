import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { useTranslation } from '../services/i18n';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState<'it' | 'en'>('it');
  const { t } = useTranslation();

  useEffect(() => {
    // Check local storage or system preference, default to dark
    const storedTheme = localStorage.getItem('smartset_theme');
    const isDark = storedTheme === 'dark' || (!storedTheme && true); // Default to dark
    setDarkMode(isDark);

    const storedLang = localStorage.getItem('smartset_lang') as 'it' | 'en';
    if (storedLang) setLanguage(storedLang);
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    const theme = newMode ? 'dark' : 'light';
    localStorage.setItem('smartset_theme', theme);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    
    // Dispatch a custom event so other components can react if needed
    window.dispatchEvent(new Event('theme-change'));
  };

  const toggleLanguage = () => {
    const newLang = language === 'it' ? 'en' : 'it';
    setLanguage(newLang);
    localStorage.setItem('smartset_lang', newLang);
    // Dispatch event for language change (to be handled by i18n system later)
    window.dispatchEvent(new Event('language-change'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('settings_title')}</h3>
        
        <div className="space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-300">
              {darkMode ? t('dark_theme') : t('light_theme')}
            </span>
            <button 
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : ''}`}></div>
            </button>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-300">
              {t('language_label')}: {language === 'it' ? 'Italiano' : 'English'}
            </span>
            <button 
              onClick={toggleLanguage}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${language === 'en' ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${language === 'en' ? 'translate-x-6' : ''}`}></div>
            </button>
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={onClose} className="w-full">{t('close')}</Button>
        </div>
      </div>
    </div>
  );
};
