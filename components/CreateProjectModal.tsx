import React, { useState } from 'react';
import { Button } from './Button';
import { ProductionType } from '../types';
import { useTranslation } from '../services/i18n';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (name: string, type: ProductionType, startDate: string, endDate: string, shootDays: string[]) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ProductionType>(ProductionType.Feature);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shootDays, setShootDays] = useState<string[]>([]);
  const { t } = useTranslation();

  const handleGenerateDays = () => {
    if (!startDate || !endDate) return;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days: string[] = [];
    
    // Loop from start to end
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(d.toISOString().split('T')[0]);
    }
    
    setShootDays(days);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name, type, startDate, endDate, shootDays);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t('new_project_modal_title')}</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{t('project_name_label')}</label>
                    <input 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500"
                        placeholder="es. Il Padrino IV"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Tipo Produzione</label>
                    <div className="relative">
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as ProductionType)}
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 appearance-none"
                        >
                            <option value={ProductionType.Feature}>Lungometraggio</option>
                            <option value={ProductionType.Medium}>Mediometraggio</option>
                            <option value={ProductionType.Short}>Cortometraggio</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                            <i className="fa-solid fa-chevron-down text-xs"></i>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Giorni di Ripresa</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Inizio</label>
                            <input 
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Fine</label>
                            <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary-500"
                            />
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleGenerateDays}
                        disabled={!startDate || !endDate}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
                    >
                        Genera giorni PDL
                    </button>

                    {shootDays.length > 0 && (
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium text-center bg-green-100 dark:bg-green-900/30 py-2 rounded border border-green-200 dark:border-green-800">
                            <i className="fa-solid fa-check mr-1"></i> {shootDays.length} giorni generati
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose} className="flex-1">{t('cancel')}</Button>
                    <Button onClick={handleCreate} disabled={!name} className="flex-1">{t('create_project')}</Button>
                </div>
            </div>
        </div>
    </div>
  );
};
