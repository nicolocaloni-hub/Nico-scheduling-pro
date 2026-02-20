import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { db } from '../services/store';

interface PrintSetupModalProps {
  projectId: string;
  onClose: () => void;
}

export const PrintSetupModal: React.FC<PrintSetupModalProps> = ({ projectId, onClose }) => {
  const [showTime, setShowTime] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [dayLabels, setDayLabels] = useState<string[]>([]);

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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-4">Impostazioni Stampa</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Titolo Progetto (Header)</label>
            <input 
              value={projectTitle}
              onChange={e => setProjectTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
              placeholder="Titolo del film"
            />
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={showTime} 
              onChange={e => setShowTime(e.target.checked)}
              className="w-5 h-5 rounded bg-gray-800 border-gray-700"
            />
            <label className="text-sm text-white">Mostra orario approssimativo</label>
          </div>

          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Etichette Giorni (opzionale)</label>
             <p className="text-xs text-gray-500 mb-2">Lascia vuoto per usare default "Day 1", "Day 2"...</p>
             {/* Simplified for now: just a note that it's editable in full version */}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">Annulla</Button>
          <Button onClick={handleSave} className="flex-1">Salva</Button>
        </div>
      </div>
    </div>
  );
};
