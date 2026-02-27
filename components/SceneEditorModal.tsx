import React, { useState, useEffect } from 'react';
import { Scene, IntExt, DayNight, ProductionElement, ElementCategory } from '../types';
import { Button } from './Button';
import { useTranslation } from '../services/i18n';

interface SceneEditorModalProps {
  scene: Scene;
  elements?: ProductionElement[];
  onClose: () => void;
  onSave: (updatedScene: Scene) => void;
}

export const SceneEditorModal: React.FC<SceneEditorModalProps> = ({ scene, elements = [], onClose, onSave }) => {
  const [data, setData] = useState<Scene>({ ...scene });
  const { t } = useTranslation();

  const handleChange = (field: keyof Scene, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const toggleElement = (elementId: string) => {
    setData(prev => {
        const currentIds = prev.elementIds || [];
        if (currentIds.includes(elementId)) {
            return { ...prev, elementIds: currentIds.filter(id => id !== elementId) };
        } else {
            return { ...prev, elementIds: [...currentIds, elementId] };
        }
    });
  };

  const castMembers = elements.filter(e => e.category === ElementCategory.Cast);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('edit_scene_title')} {data.sceneNumber}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('slugline')}</label>
            <div className="grid grid-cols-3 gap-2">
              <select 
                value={data.intExt} 
                onChange={e => handleChange('intExt', e.target.value)}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white text-sm"
              >
                <option value="INT.">INT.</option>
                <option value="EXT.">EXT.</option>
                <option value="I/E.">I/E.</option>
              </select>
              <input 
                value={data.setName}
                onChange={e => handleChange('setName', e.target.value)}
                className="col-span-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white text-sm"
                placeholder={t('set_name_placeholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('day_night')}</label>
            <select 
              value={data.dayNight} 
              onChange={e => handleChange('dayNight', e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white text-sm"
            >
              <option value="DAY">DAY</option>
              <option value="NIGHT">NIGHT</option>
              <option value="MORNING">MORNING</option>
              <option value="EVENING">EVENING</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('real_location')}</label>
            <input 
              value={data.locationName}
              onChange={e => handleChange('locationName', e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('pages')}</label>
            <input 
              value={data.pageCountInEighths}
              onChange={e => handleChange('pageCountInEighths', e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('synopsis')}</label>
            <textarea 
              value={data.synopsis}
              onChange={e => handleChange('synopsis', e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white text-sm h-24"
            />
          </div>

          {castMembers.length > 0 && (
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cast</label>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 max-h-40 overflow-y-auto">
                    {castMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-2 py-1">
                            <input 
                                type="checkbox" 
                                id={`cast-${member.id}`}
                                checked={(data.elementIds || []).includes(member.id)}
                                onChange={() => toggleElement(member.id)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor={`cast-${member.id}`} className="text-sm text-gray-900 dark:text-white cursor-pointer select-none">
                                {member.name}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">{t('cancel')}</Button>
          <Button onClick={() => onSave(data)} className="flex-1">{t('save')}</Button>
        </div>
      </div>
    </div>
  );
};
