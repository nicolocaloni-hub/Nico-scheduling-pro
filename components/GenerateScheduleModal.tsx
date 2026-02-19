import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { db } from '../services/store';
import { Button } from './Button';

interface GenerateScheduleModalProps {
  projectId: string;
  onClose: () => void;
  onGenerate: () => void;
}

export const GenerateScheduleModal: React.FC<GenerateScheduleModalProps> = ({ projectId, onClose, onGenerate }) => {
  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<{ date: string; scenes: string }[]>([]);

  const handleDateRangeSubmit = () => {
    if (!startDate || !endDate) return;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayList = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dayList.push({
        date: d.toISOString().split('T')[0],
        scenes: ''
      });
    }
    setDays(dayList);
    setStep(2);
  };

  const handleSceneChange = (index: number, val: string) => {
    const newDays = [...days];
    newDays[index].scenes = val;
    setDays(newDays);
  };

  const handleFinalSubmit = async () => {
    for (const day of days) {
      if (!day.scenes.trim()) continue;
      
      const sceneList = day.scenes.split(/[\s,]+/).filter(s => s.trim().length > 0);
      
      const newEvent: CalendarEvent = {
        id: crypto.randomUUID(),
        projectId,
        date: day.date,
        title: `Riprese - Scene ${sceneList.join(', ')}`,
        type: 'shooting',
        scenes: sceneList,
        time: '08:00'
      };
      
      await db.saveEvent(newEvent);
    }
    onGenerate();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
          <h3 className="font-bold text-white">Genera Calendario Riprese</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Seleziona il periodo delle riprese.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inizio</label>
                  <input 
                    type="date" 
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fine</label>
                  <input 
                    type="date" 
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={handleDateRangeSubmit} disabled={!startDate || !endDate} className="w-full">
                  Avanti <i className="fa-solid fa-arrow-right ml-2"></i>
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Assegna le scene per ogni giorno (es. "1, 2, 5").</p>
              <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 no-scrollbar">
                {days.map((day, idx) => (
                  <div key={day.date} className="flex items-center gap-3 bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                    <div className="w-24 text-xs font-mono text-gray-400">
                      {new Date(day.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', weekday: 'short' })}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Scene (es. 1, 4A, 5)"
                      className="flex-1 bg-transparent border-b border-gray-600 focus:border-primary-500 outline-none text-sm text-white px-2 py-1"
                      value={day.scenes}
                      onChange={e => handleSceneChange(idx, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="pt-4 flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Indietro</Button>
                <Button onClick={handleFinalSubmit} className="flex-1">Genera Eventi</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
