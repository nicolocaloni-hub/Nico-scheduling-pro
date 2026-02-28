import React, { useState, useEffect } from 'react';
import { Scene, IntExt, DayNight, ProductionElement, ElementCategory } from '../types';
import { Button } from './Button';
import { useTranslation } from '../services/i18n';
import { db } from '../services/store';
import { Plus, Trash2 } from 'lucide-react';

interface SceneEditorModalProps {
  scene: Scene;
  elements?: ProductionElement[];
  onClose: () => void;
  onSave: (updatedScene: Scene) => void;
  onDeleteElement?: (elementId: string) => void;
}

export const SceneEditorModal: React.FC<SceneEditorModalProps> = ({ scene, elements = [], onClose, onSave, onDeleteElement }) => {
  const [data, setData] = useState<Scene>({ ...scene });
  const [tempElements, setTempElements] = useState<ProductionElement[]>([]);
  const [elementToDelete, setElementToDelete] = useState<ProductionElement | null>(null);
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

  const handleAddTempElement = (category: ElementCategory) => {
    const newEl: ProductionElement = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        projectId: scene.projectId,
        name: '',
        category: category
    };
    setTempElements(prev => [...prev, newEl]);
    // Auto-check the new element
    setData(prev => ({
        ...prev,
        elementIds: [...(prev.elementIds || []), newEl.id]
    }));
  };

  const handleTempElementChange = (id: string, newName: string) => {
    setTempElements(prev => prev.map(el => el.id === id ? { ...el, name: newName } : el));
  };

  const handleDeleteClick = (element: ProductionElement) => {
    setElementToDelete(element);
  };

  const confirmDeleteElement = () => {
    if (elementToDelete && onDeleteElement) {
        onDeleteElement(elementToDelete.id);
        setElementToDelete(null);
    }
  };

  const handleSaveWrapper = async () => {
      // 1. Filter valid new elements
      const validNewElements = tempElements.filter(el => el.name.trim() !== '');
      
      let finalElementIds = [...(data.elementIds || [])];

      if (validNewElements.length > 0) {
          // 2. Create real elements
          const realElements = validNewElements.map(el => ({
              ...el,
              id: crypto.randomUUID() // Create real ID
          }));

          // 3. Save to DB
          const currentElements = await db.getElements(scene.projectId);
          await db.saveElements(scene.projectId, [...currentElements, ...realElements]);

          // 4. Update scene elementIds
          finalElementIds = finalElementIds.map(id => {
              const tempEl = validNewElements.find(t => t.id === id);
              if (tempEl) {
                  // Find corresponding real element
                  const realEl = realElements.find(r => r.name === tempEl.name && r.category === tempEl.category);
                  return realEl ? realEl.id : id;
              }
              return id;
          });
      }
      
      // Remove any remaining temp IDs (e.g. empty name ones or unchecked ones that were not saved)
      finalElementIds = finalElementIds.filter(id => !id.startsWith('temp-'));

      const finalData = { ...data, elementIds: finalElementIds };
      onSave(finalData);
  };

  const castMembers = elements.filter(e => e.category === ElementCategory.Cast || (e.category || '').toLowerCase() === 'character');
  
  const propsElements = elements.filter(e => {
    const cat = (e.category || '').toLowerCase();
    return (
      cat === 'props' || 
      cat === 'prop' || 
      cat.includes('oggetti') || 
      cat.includes('attrezzeria') || 
      e.category === ElementCategory.Props
    );
  });

  const tempCast = tempElements.filter(e => e.category === ElementCategory.Cast);
  const tempProps = tempElements.filter(e => e.category === ElementCategory.Props);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto transition-colors duration-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('edit_scene_title')} {data.sceneNumber}</h3>
        
        <div className="space-y-4">
          {/* ... existing fields ... */}
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

          <div>
            <div className="flex items-center gap-2 mb-1">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase leading-none">Cast</label>
                <button 
                    onClick={() => handleAddTempElement(ElementCategory.Cast)}
                    className="w-4 h-4 rounded-full border border-blue-500 text-blue-500 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="Aggiungi Cast"
                >
                    <Plus className="w-3 h-3" strokeWidth={3} />
                </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 max-h-40 overflow-y-auto">
                {castMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-2 py-1 group justify-between">
                        <div className="flex items-center gap-2">
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
                        <button 
                            onClick={() => handleDeleteClick(member)}
                            className="text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="Elimina personaggio"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                {tempCast.map(member => (
                    <div key={member.id} className="flex items-center gap-2 py-1 animate-in fade-in slide-in-from-left-2">
                        <input 
                            type="checkbox" 
                            id={`cast-${member.id}`}
                            checked={(data.elementIds || []).includes(member.id)}
                            onChange={() => toggleElement(member.id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <input 
                            type="text"
                            value={member.name}
                            onChange={(e) => handleTempElementChange(member.id, e.target.value)}
                            className="flex-1 text-sm border-b border-gray-300 dark:border-gray-600 focus:border-primary-500 outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                            placeholder="Nome personaggio..."
                            autoFocus
                        />
                    </div>
                ))}
                {castMembers.length === 0 && tempCast.length === 0 && (
                    <div className="text-xs text-gray-400 italic text-center py-2">Nessun membro del cast</div>
                )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase leading-none">Props</label>
                <button 
                    onClick={() => handleAddTempElement(ElementCategory.Props)}
                    className="w-4 h-4 rounded-full border border-blue-500 text-blue-500 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="Aggiungi Prop"
                >
                    <Plus className="w-3 h-3" strokeWidth={3} />
                </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 max-h-40 overflow-y-auto">
                {propsElements.map(member => (
                    <div key={member.id} className="flex items-center gap-2 py-1 group justify-between">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id={`prop-${member.id}`}
                                checked={(data.elementIds || []).includes(member.id)}
                                onChange={() => toggleElement(member.id)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor={`prop-${member.id}`} className="text-sm text-gray-900 dark:text-white cursor-pointer select-none">
                                {member.name}
                            </label>
                        </div>
                        <button 
                            onClick={() => handleDeleteClick(member)}
                            className="text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="Elimina prop"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                {tempProps.map(member => (
                    <div key={member.id} className="flex items-center gap-2 py-1 animate-in fade-in slide-in-from-left-2">
                        <input 
                            type="checkbox" 
                            id={`prop-${member.id}`}
                            checked={(data.elementIds || []).includes(member.id)}
                            onChange={() => toggleElement(member.id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <input 
                            type="text"
                            value={member.name}
                            onChange={(e) => handleTempElementChange(member.id, e.target.value)}
                            className="flex-1 text-sm border-b border-gray-300 dark:border-gray-600 focus:border-primary-500 outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                            placeholder="Nome oggetto..."
                            autoFocus
                        />
                    </div>
                ))}
                {propsElements.length === 0 && tempProps.length === 0 && (
                    <div className="text-xs text-gray-400 italic text-center py-2">Nessun prop</div>
                )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">{t('cancel')}</Button>
          <Button onClick={handleSaveWrapper} className="flex-1">{t('save')}</Button>
        </div>

        {/* Delete Confirmation Modal */}
        {elementToDelete && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">
                        Elimina {elementToDelete.category === ElementCategory.Cast ? 'Personaggio' : 'Prop'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                        Sei sicuro di voler eliminare <span className="font-bold text-gray-900 dark:text-white">{elementToDelete.name}</span>?
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setElementToDelete(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Annulla
                        </button>
                        <button 
                            onClick={confirmDeleteElement}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                        >
                            Elimina
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
