import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Scene, ProductionElement, ElementCategory, IntExt, DayNight, Stripboard } from '../types';
import { Button } from '../components/Button';

export const ManualStripboardCreate: React.FC = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [scenes, setScenes] = useState<Scene[]>([]);
  
  // Current Scene State
  const [sceneNumber, setSceneNumber] = useState('');
  const [intExt, setIntExt] = useState<IntExt>('INT.');
  const [setName, setSetName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [dayNight, setDayNight] = useState<DayNight>('DAY');
  const [pages, setPages] = useState('');
  const [synopsis, setSynopsis] = useState('');
  
  // Elements State
  const [availableCast, setAvailableCast] = useState<ProductionElement[]>([]);
  const [availableProps, setAvailableProps] = useState<ProductionElement[]>([]);
  const [selectedCast, setSelectedCast] = useState<string[]>([]);
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  
  // New Element Inputs
  const [newCastName, setNewCastName] = useState('');
  const [newPropName, setNewPropName] = useState('');
  const [showCastInput, setShowCastInput] = useState(false);
  const [showPropInput, setShowPropInput] = useState(false);

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) return navigate('/');
    setProjectId(pid);
    loadElements(pid);
    loadDraft(pid);
  }, [navigate]);

  const loadDraft = async (pid: string) => {
    const draft = await db.loadManualPdlDraft(pid);
    if (draft) {
      if (draft.scenes) setScenes(draft.scenes);
      if (draft.currentScene) {
        const cs = draft.currentScene;
        setSceneNumber(cs.sceneNumber || '');
        setIntExt(cs.intExt || 'INT.');
        setSetName(cs.setName || '');
        setLocationName(cs.locationName || '');
        setDayNight(cs.dayNight || 'DAY');
        setPages(cs.pages || '');
        setSynopsis(cs.synopsis || '');
        setSelectedCast(cs.selectedCast || []);
        setSelectedProps(cs.selectedProps || []);
        setStep(cs.step || 1);
      }
    }
  };

  const saveDraft = () => {
    if (!projectId) return;
    const currentScene = {
      sceneNumber, intExt, setName, locationName, dayNight, pages, synopsis, selectedCast, selectedProps, step
    };
    db.saveManualPdlDraft(projectId, { scenes, currentScene });
  };

  useEffect(() => {
    if (projectId) saveDraft();
  }, [sceneNumber, intExt, setName, locationName, dayNight, pages, synopsis, selectedCast, selectedProps, step, scenes]);

  const loadElements = async (pid: string) => {
    const elements = await db.getElements(pid);
    setAvailableCast(elements.filter(e => e.category === ElementCategory.Cast || e.category === 'character'));
    setAvailableProps(elements.filter(e => e.category === ElementCategory.Props || e.category === 'prop'));
  };

  const handleAddElement = async (type: 'cast' | 'prop', name: string) => {
    if (!projectId || !name.trim()) return;
    
    const newEl: ProductionElement = {
      id: crypto.randomUUID(),
      projectId,
      name: name.trim(),
      category: type === 'cast' ? ElementCategory.Cast : ElementCategory.Props
    };
    
    const allElements = await db.getElements(projectId);
    await db.saveElements(projectId, [...allElements, newEl]);
    
    if (type === 'cast') {
      setAvailableCast(prev => [...prev, newEl]);
      setSelectedCast(prev => [...prev, newEl.id]);
      setNewCastName('');
      setShowCastInput(false);
    } else {
      setAvailableProps(prev => [...prev, newEl]);
      setSelectedProps(prev => [...prev, newEl.id]);
      setNewPropName('');
      setShowPropInput(false);
    }
  };

  const toggleSelection = (id: string, type: 'cast' | 'prop') => {
    if (type === 'cast') {
      setSelectedCast(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelectedProps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };

  const saveScene = () => {
    if (!projectId) return;
    
    const newScene: Scene = {
      id: crypto.randomUUID(),
      projectId,
      sceneNumber,
      slugline: `${intExt} ${setName} - ${dayNight}`,
      intExt,
      dayNight,
      setName,
      locationName,
      pageCountInEighths: pages,
      pages: parseFloat(pages) || 0, // Simplified parsing
      synopsis,
      elementIds: [...selectedCast, ...selectedProps]
    };
    
    setScenes(prev => [...prev, newScene]);
    resetForm();
  };

  const resetForm = () => {
    setSceneNumber('');
    setSetName('');
    setLocationName('');
    setPages('');
    setSynopsis('');
    setSelectedCast([]);
    setSelectedProps([]);
    setStep(1);
  };

  const finishAndSaveBoard = async () => {
    if (!projectId || scenes.length === 0) return;
    
    // Save scenes to DB (append or replace? Manual mode implies creating new set or appending. 
    // Usually we append to project scenes.
    const currentScenes = await db.getProjectScenes(projectId);
    const allScenes = [...currentScenes, ...scenes];
    await db.saveScenes(projectId, allScenes);
    
    // Create Stripboard
    const newBoard: Stripboard = {
      id: crypto.randomUUID(),
      projectId,
      name: 'PDL Manuale',
      strips: scenes.map((s, i) => ({
        id: crypto.randomUUID(),
        sceneId: s.id,
        order: i
      }))
    };
    
    await db.saveStripboard(newBoard);
    await db.clearManualPdlDraft(projectId);
    navigate('/stripboard');
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4 animate-in slide-in-from-right">
            <label className="block text-sm font-bold text-gray-400">Numero Scena</label>
            <input 
              autoFocus
              value={sceneNumber}
              onChange={e => setSceneNumber(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-2xl font-black text-white focus:border-primary-500 outline-none"
              placeholder="es. 1, 2A"
            />
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!sceneNumber}>Avanti</Button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in slide-in-from-right">
             <label className="block text-sm font-bold text-gray-400">Interno / Esterno</label>
             <div className="grid grid-cols-2 gap-3">
               {['INT.', 'EXT.', 'I/E.'].map(opt => (
                 <button 
                   key={opt}
                   onClick={() => { setIntExt(opt as IntExt); setStep(3); }}
                   className={`p-4 rounded-xl border font-bold ${intExt === opt ? 'bg-primary-600 border-primary-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                 >
                   {opt}
                 </button>
               ))}
             </div>
             <div className="flex justify-between pt-4">
               <Button variant="secondary" onClick={() => setStep(1)}>Indietro</Button>
             </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-in slide-in-from-right">
            <label className="block text-sm font-bold text-gray-400">Nome Set (Ambiente)</label>
            <input 
              autoFocus
              value={setName}
              onChange={e => setSetName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white focus:border-primary-500 outline-none"
              placeholder="es. CUCINA, PARCO"
            />
            <div className="flex justify-between pt-4">
               <Button variant="secondary" onClick={() => setStep(2)}>Indietro</Button>
               <Button onClick={() => setStep(4)} disabled={!setName}>Avanti</Button>
             </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 animate-in slide-in-from-right">
            <label className="block text-sm font-bold text-gray-400">Location Reale (Dove si gira)</label>
            <input 
              autoFocus
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white focus:border-primary-500 outline-none"
              placeholder="es. Via Roma 10, Studio 5"
            />
            <div className="flex justify-between pt-4">
               <Button variant="secondary" onClick={() => setStep(3)}>Indietro</Button>
               <Button onClick={() => setStep(5)}>Avanti</Button>
             </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4 animate-in slide-in-from-right">
             <label className="block text-sm font-bold text-gray-400">Giorno / Notte</label>
             <div className="grid grid-cols-2 gap-3">
               {['DAY', 'NIGHT', 'MORNING', 'EVENING'].map(opt => (
                 <button 
                   key={opt}
                   onClick={() => { setDayNight(opt as DayNight); setStep(6); }}
                   className={`p-4 rounded-xl border font-bold ${dayNight === opt ? 'bg-primary-600 border-primary-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                 >
                   {opt}
                 </button>
               ))}
             </div>
             <div className="flex justify-between pt-4">
               <Button variant="secondary" onClick={() => setStep(4)}>Indietro</Button>
             </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4 animate-in slide-in-from-right">
            <label className="block text-sm font-bold text-gray-400">Pagine (es. 1, 0.5, 2/8)</label>
            <input 
              autoFocus
              value={pages}
              onChange={e => setPages(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white focus:border-primary-500 outline-none"
              placeholder="es. 1 4/8"
            />
            <div className="flex justify-between pt-4">
               <Button variant="secondary" onClick={() => setStep(5)}>Indietro</Button>
               <Button onClick={() => setStep(7)} disabled={!pages}>Avanti</Button>
             </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4 animate-in slide-in-from-right">
            <label className="block text-sm font-bold text-gray-400">Sinossi Breve</label>
            <textarea 
              autoFocus
              value={synopsis}
              onChange={e => setSynopsis(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white focus:border-primary-500 outline-none h-32"
              placeholder="Descrivi brevemente cosa succede..."
            />
            <div className="flex justify-between pt-4">
               <Button variant="secondary" onClick={() => setStep(6)}>Indietro</Button>
               <Button onClick={() => setStep(8)}>Avanti</Button>
             </div>
          </div>
        );
      case 8: // Elements
        return (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-gray-400">Cast Presente</label>
                <button onClick={() => setShowCastInput(!showCastInput)} className="text-primary-400 text-xs font-bold">+ Aggiungi</button>
              </div>
              
              {showCastInput && (
                <div className="flex gap-2 mb-3">
                  <input 
                    className="flex-1 bg-gray-800 rounded px-3 py-2 text-sm text-white border border-gray-700"
                    placeholder="Nome personaggio"
                    value={newCastName}
                    onChange={e => setNewCastName(e.target.value)}
                  />
                  <Button onClick={() => handleAddElement('cast', newCastName)} disabled={!newCastName} className="h-full py-1">OK</Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {availableCast.map(c => (
                  <button
                    key={c.id}
                    onClick={() => toggleSelection(c.id, 'cast')}
                    className={`px-3 py-1 rounded-full text-xs border ${selectedCast.includes(c.id) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                  >
                    {c.name}
                  </button>
                ))}
                {availableCast.length === 0 && <span className="text-xs text-gray-500 italic">Nessun personaggio. Aggiungine uno.</span>}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-gray-400">Props</label>
                <button onClick={() => setShowPropInput(!showPropInput)} className="text-primary-400 text-xs font-bold">+ Aggiungi</button>
              </div>

              {showPropInput && (
                <div className="flex gap-2 mb-3">
                  <input 
                    className="flex-1 bg-gray-800 rounded px-3 py-2 text-sm text-white border border-gray-700"
                    placeholder="Nome oggetto"
                    value={newPropName}
                    onChange={e => setNewPropName(e.target.value)}
                  />
                  <Button onClick={() => handleAddElement('prop', newPropName)} disabled={!newPropName} className="h-full py-1">OK</Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {availableProps.map(p => (
                  <button
                    key={p.id}
                    onClick={() => toggleSelection(p.id, 'prop')}
                    className={`px-3 py-1 rounded-full text-xs border ${selectedProps.includes(p.id) ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                  >
                    {p.name}
                  </button>
                ))}
                {availableProps.length === 0 && <span className="text-xs text-gray-500 italic">Nessun oggetto. Aggiungine uno.</span>}
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-gray-700">
               <Button variant="secondary" onClick={() => setStep(7)}>Indietro</Button>
               <Button onClick={() => { saveScene(); }}>Salva Scena</Button>
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4 min-h-screen flex flex-col">
      <header className="mb-8">
        <h1 className="text-2xl font-black text-white mb-1">Nuova Scena</h1>
        <p className="text-gray-400 text-sm">Step {step} di 8</p>
        <div className="w-full bg-gray-800 h-1 mt-4 rounded-full overflow-hidden">
          <div className="bg-primary-500 h-full transition-all duration-300" style={{ width: `${(step/8)*100}%` }}></div>
        </div>
      </header>

      <div className="flex-1">
        {renderStep()}
      </div>

      {scenes.length > 0 && step === 1 && (
        <div className="mt-8 pt-8 border-t border-gray-800">
          <h3 className="text-white font-bold mb-4">Scene Create ({scenes.length})</h3>
          <div className="space-y-3 mb-6 max-h-40 overflow-y-auto">
            {scenes.map((s, i) => (
              <div key={i} className="bg-gray-900 p-3 rounded border border-gray-800 flex justify-between items-center">
                <span className="font-bold text-white text-sm">SC. {s.sceneNumber}</span>
                <span className="text-xs text-gray-400 truncate max-w-[150px]">{s.slugline}</span>
              </div>
            ))}
          </div>
          <Button onClick={finishAndSaveBoard} className="w-full bg-green-600 hover:bg-green-500">
            Termina e Genera PDL
          </Button>
        </div>
      )}
    </div>
  );
};
