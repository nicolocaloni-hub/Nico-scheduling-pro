import React, { useState } from 'react';
import { Button } from './Button';

interface AddDayModalProps {
    onClose: () => void;
    onSave: (startDate: string, endDate: string) => void;
}

export const AddDayModal: React.FC<AddDayModalProps> = ({ onClose, onSave }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleSave = () => {
        if (startDate && endDate) {
            onSave(startDate, endDate);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Aggiungi Giorni di Ripresa</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-bold uppercase tracking-wider">Dal</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-bold uppercase tracking-wider">Al</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button variant="secondary" onClick={onClose} className="flex-1">Annulla</Button>
                        <Button onClick={handleSave} disabled={!startDate || !endDate} className="flex-1">Salva</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
