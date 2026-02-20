import React, { useState, useEffect } from 'react';
import { Scene, IntExt, DayNight } from '../types';
import { Button } from './Button';

interface SceneEditorModalProps {
  scene: Scene;
  onClose: () => void;
  onSave: (updatedScene: Scene) => void;
}

export const SceneEditorModal: React.FC<SceneEditorModalProps> = ({ scene, onClose, onSave }) => {
  const [data, setData] = useState<Scene>({ ...scene });

  const handleChange = (field: keyof Scene, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-white mb-4">Modifica Scena {data.sceneNumber}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slugline</label>
            <div className="grid grid-cols-3 gap-2">
              <select 
                value={data.intExt} 
                onChange={e => handleChange('intExt', e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
              >
                <option value="INT.">INT.</option>
                <option value="EXT.">EXT.</option>
                <option value="I/E.">I/E.</option>
              </select>
              <input 
                value={data.setName}
                onChange={e => handleChange('setName', e.target.value)}
                className="col-span-2 bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                placeholder="Set Name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Giorno / Notte</label>
            <select 
              value={data.dayNight} 
              onChange={e => handleChange('dayNight', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
            >
              <option value="DAY">DAY</option>
              <option value="NIGHT">NIGHT</option>
              <option value="MORNING">MORNING</option>
              <option value="EVENING">EVENING</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location Reale</label>
            <input 
              value={data.locationName}
              onChange={e => handleChange('locationName', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pagine</label>
            <input 
              value={data.pageCountInEighths}
              onChange={e => handleChange('pageCountInEighths', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sinossi</label>
            <textarea 
              value={data.synopsis}
              onChange={e => handleChange('synopsis', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm h-24"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">Annulla</Button>
          <Button onClick={() => onSave(data)} className="flex-1">Salva</Button>
        </div>
      </div>
    </div>
  );
};
