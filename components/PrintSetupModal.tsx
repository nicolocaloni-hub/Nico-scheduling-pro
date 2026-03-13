import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { db } from '../services/store';
import { useTranslation } from '../services/i18n';
import { PrintSetup, DayPrintSettings } from '../types';
import { Clock, Coffee } from 'lucide-react';

interface PrintSetupModalProps {
  projectId: string;
  availableDays: string[];
  onClose: () => void;
  onPrint?: () => void;
}

export const PrintSetupModal: React.FC<PrintSetupModalProps> = ({ projectId, availableDays, onClose, onPrint }) => {
  const [showTime, setShowTime] = useState(false);
  const [includeExtraBanners, setIncludeExtraBanners] = useState(false);
  const [useMovieMagicColors, setUseMovieMagicColors] = useState(false);
  const [dayLabels, setDayLabels] = useState<string[]>([]);
  const [daySettings, setDaySettings] = useState<Record<string, DayPrintSettings>>({});
  const { t } = useTranslation();

  useEffect(() => {
    db.getPrintSetup(projectId).then(setup => {
      if (setup) {
        setShowTime(setup.showTime || false);
        setIncludeExtraBanners(setup.includeExtraBanners || false);
        setUseMovieMagicColors(setup.useMovieMagicColors || false);
        setDayLabels(setup.dayLabels || []);
        setDaySettings(setup.daySettings || {});
      }
    });
  }, [projectId]);

  const handleSave = async () => {
    await db.savePrintSetup(projectId, { 
      showTime, 
      includeExtraBanners, 
      useMovieMagicColors,
      dayLabels,
      daySettings
    });
    if (onPrint) {
      onPrint();
    }
    onClose();
  };

  const updateDaySetting = (day: string, field: keyof DayPrintSettings, value: string) => {
    setDaySettings(prev => ({
      ...prev,
      [day]: {
        ...(prev[day] || { startTime: '10:00', endTime: '19:00', pauseStart: '14:00', pauseEnd: '15:00' }),
        [field]: value
      }
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('print_settings_title')}</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* General Settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-primary-600 uppercase tracking-widest">Impostazioni Generali</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-all">
                <input 
                  type="checkbox" 
                  checked={includeExtraBanners} 
                  onChange={e => setIncludeExtraBanners(e.target.checked)}
                  className="w-5 h-5 rounded-lg text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Mostra banner Orari/Pausa</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-all">
                <input 
                  type="checkbox" 
                  checked={useMovieMagicColors} 
                  onChange={e => setUseMovieMagicColors(e.target.checked)}
                  className="w-5 h-5 rounded-lg text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Colora scene (Movie Magic)</span>
              </label>
            </div>
          </div>

          {/* Day Specific Settings */}
          {includeExtraBanners && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-primary-600 uppercase tracking-widest">Orari Giornalieri</h4>
              <div className="space-y-3">
                {availableDays.map((day) => (
                  <div key={day} className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="text-xs font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                      {new Date(day).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                          <Clock size={10} /> Inizio
                        </label>
                        <input 
                          type="time"
                          value={daySettings[day]?.startTime || '10:00'}
                          onChange={e => updateDaySetting(day, 'startTime', e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                          <Clock size={10} /> Fine
                        </label>
                        <input 
                          type="time"
                          value={daySettings[day]?.endTime || '19:00'}
                          onChange={e => updateDaySetting(day, 'endTime', e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                          <Coffee size={10} /> Pausa Da
                        </label>
                        <input 
                          type="time"
                          value={daySettings[day]?.pauseStart || '14:00'}
                          onChange={e => updateDaySetting(day, 'pauseStart', e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                          <Coffee size={10} /> Pausa A
                        </label>
                        <input 
                          type="time"
                          value={daySettings[day]?.pauseEnd || '15:00'}
                          onChange={e => updateDaySetting(day, 'pauseEnd', e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3 bg-gray-50/50 dark:bg-gray-900/50">
          <Button variant="secondary" onClick={onClose} className="flex-1 rounded-xl h-12 font-bold uppercase tracking-wider text-xs">
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} className="flex-1 rounded-xl h-12 font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary-500/20">
            Stampa PDF
          </Button>
        </div>
      </div>
    </div>
  );
};
