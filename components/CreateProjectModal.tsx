import React, { useState } from 'react';
import { Button } from './Button';
import { ProductionType } from '../types';
import { useTranslation } from '../services/i18n';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (name: string, type: ProductionType, startDate: string, endDate: string) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ProductionType>(ProductionType.Feature);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { t } = useTranslation();

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name, type, startDate, endDate);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md p-6 rounded-2xl shadow-2xl">
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
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Data Inizio</label>
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Data Fine</label>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500"
                        />
                    </div>
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
