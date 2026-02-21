import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { db } from '../services/store';
import { useTranslation } from '../services/i18n';

interface PrintSetupModalProps {
  projectId: string;
  onClose: () => void;
}

export const PrintSetupModal: React.FC<PrintSetupModalProps> = ({ projectId, onClose }) => {
  const [showTime, setShowTime] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [dayLabels, setDayLabels] = useState<string[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    db.getPrintSetup(projectId).then(setup => {
      if (setup) {
        setShowTime(setup.showTime || false);
        setProjectTitle(setup.projectTitle || '');
        setDayLabels(setup.dayLabels || []);
      }
    });
  }, [projectId]);

  const handleSave = async () => {
    await db.savePrintSetup(projectId, { showTime, projectTitle, dayLabels });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('print_settings_title')}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('project_title_header')}</label>
            <input 
              value={projectTitle}
              onChange={e => setProjectTitle(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white text-sm"
              placeholder={t('project_title_placeholder')}
            />
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={showTime} 
              onChange={e => setShowTime(e.target.checked)}
              className="w-5 h-5 rounded bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            />
            <label className="text-sm text-gray-900 dark:text-white">{t('show_approx_time')}</label>
          </div>

          <div>
             <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('day_labels_optional')}</label>
             <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('day_labels_desc')}</p>
             {/* Simplified for now: just a note that it's editable in full version */}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">{t('cancel')}</Button>
          <Button onClick={handleSave} className="flex-1">{t('save')}</Button>
        </div>
      </div>
    </div>
  );
};
